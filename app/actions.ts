"use server";

import JSZip from "jszip";

export interface ModAnalysisResult {
  isClientOnly: boolean;
  modName: string;
  modLoader: "forge" | "neoforge" | "fabric" | "quilt" | "unknown";
  reason: string;
  detectedFiles?: string[];
}

// Client-side only indicators in class files and packages
const CLIENT_ONLY_PATTERNS = [
  /net\.minecraft\.client/,
  /net\.minecraftforge\.client/,
  /net\.neoforged\.neoforge\.client/,
  /net\.fabricmc\.fabric\.api\.client/,
  /org\.quiltmc\.qsl\.client/,
  /com\.mojang\.blaze3d/,
  /org\.lwjgl/,
];

// Keywords that indicate client-side functionality
const CLIENT_KEYWORDS = [
  "renderer",
  "shader",
  "gui",
  "screen",
  "hud",
  "overlay",
  "texture",
  "model",
  "optifine",
  "iris",
];

async function parseForgeModsToml(
  content: string
): Promise<{ name: string; isClientOnly: boolean } | null> {
  const lines = content.split("\n");
  let modId = "Unknown Mod";
  let isClientOnly = false;

  for (const line of lines) {
    // Check for mod ID
    const modIdMatch = line.match(/modId\s*=\s*"([^"]+)"/);
    if (modIdMatch) {
      modId = modIdMatch[1];
    }

    // Check for displayName
    const displayNameMatch = line.match(/displayName\s*=\s*"([^"]+)"/);
    if (displayNameMatch) {
      modId = displayNameMatch[1];
    }

    // Check for client side only
    if (
      line.includes('side="CLIENT"') ||
      line.includes("side='CLIENT'") ||
      line.includes("clientSideOnly=true") ||
      line.includes("clientSideOnly = true")
    ) {
      isClientOnly = true;
    }
  }

  return { name: modId, isClientOnly };
}

async function parseFabricModJson(
  content: string
): Promise<{ name: string; isClientOnly: boolean } | null> {
  try {
    const json = JSON.parse(content);
    const name = json.name || json.id || "Unknown Mod";
    const environment = json.environment?.toLowerCase();

    // Check for client environment
    const isClientOnly = environment === "client";

    return { name, isClientOnly };
  } catch {
    return null;
  }
}

async function parseQuiltModJson(
  content: string
): Promise<{ name: string; isClientOnly: boolean } | null> {
  try {
    const json = JSON.parse(content);
    // Quilt uses quilt_loader.metadata for name
    const metadata = json.quilt_loader?.metadata;
    const name = metadata?.name || json.quilt_loader?.id || "Unknown Mod";
    
    // Quilt uses quilt_loader.minecraft.environment
    const environment = json.quilt_loader?.minecraft?.environment?.toLowerCase();

    const isClientOnly = environment === "client";

    return { name, isClientOnly };
  } catch {
    return null;
  }
}

async function analyzeClassFiles(zip: JSZip): Promise<boolean> {
  let clientOnlyScore = 0;
  let serverCompatibleScore = 0;
  const files = Object.keys(zip.files);

  for (const fileName of files) {
    const lowerName = fileName.toLowerCase();

    // Check for client-only directories
    if (
      lowerName.includes("/client/") ||
      lowerName.includes("\\client\\") ||
      lowerName.startsWith("client/")
    ) {
      clientOnlyScore += 2;
    }

    // Check for server directories (indicates server compatibility)
    if (
      lowerName.includes("/server/") ||
      lowerName.includes("\\server\\") ||
      lowerName.startsWith("server/")
    ) {
      serverCompatibleScore += 3;
    }

    // Check for common directories (indicates both sides)
    if (lowerName.includes("/common/") || lowerName.includes("/shared/")) {
      serverCompatibleScore += 2;
    }

    // Check for client-only keywords in file names
    for (const keyword of CLIENT_KEYWORDS) {
      if (lowerName.includes(keyword)) {
        clientOnlyScore += 1;
      }
    }

    // Scan .class files for client-only package references
    if (fileName.endsWith(".class")) {
      try {
        const classFile = zip.file(fileName);
        if (classFile) {
          const content = await classFile.async("text");
          
          // Check for CLIENT_ONLY_PATTERNS in class file content
          for (const pattern of CLIENT_ONLY_PATTERNS) {
            if (pattern.test(content)) {
              clientOnlyScore += 3;
              break; // Only count once per file
            }
          }
        }
      } catch {
        // Skip files that can't be read as text
      }
    }
  }

  // If there's evidence of server code, it's not client-only
  if (serverCompatibleScore > 0) {
    return false;
  }

  // If most indicators point to client-only
  return clientOnlyScore > 5 && serverCompatibleScore === 0;
}

export async function analyzeModFile(
  formData: FormData
): Promise<ModAnalysisResult> {
  const file = formData.get("file") as File;

  if (!file) {
    return {
      isClientOnly: false,
      modName: "Unknown",
      modLoader: "unknown",
      reason: "ไม่มีไฟล์ที่อัพโหลด",
    };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith(".jar")) {
    return {
      isClientOnly: false,
      modName: file.name,
      modLoader: "unknown",
      reason: "ประเภทไฟล์ไม่ถูกต้อง กรุณาอัพโหลดไฟล์ .jar",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Detect which loader files exist
    const detectedFiles: string[] = [];
    if (zip.file("META-INF/neoforge.mods.toml")) detectedFiles.push("neoforge.mods.toml");
    if (zip.file("META-INF/mods.toml")) detectedFiles.push("mods.toml");
    if (zip.file("quilt.mod.json")) detectedFiles.push("quilt.mod.json");
    if (zip.file("fabric.mod.json")) detectedFiles.push("fabric.mod.json");

    // Try to find NeoForge neoforge.mods.toml (NeoForge-specific)
    const neoforgeToml = zip.file("META-INF/neoforge.mods.toml");
    if (neoforgeToml) {
      const content = await neoforgeToml.async("text");
      const result = await parseForgeModsToml(content);

      if (result) {
        if (result.isClientOnly) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "neoforge",
            reason:
              "มอดนี้ประกาศตัวเองว่าเป็น CLIENT-ONLY ในไฟล์ neoforge.mods.toml",
          };
        }

        const classAnalysis = await analyzeClassFiles(zip);
        if (classAnalysis) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "neoforge",
            reason:
              "มอดนี้มีเฉพาะโค้ดฝั่งไคลเอนต์ (การเรนเดอร์, GUI, เชเดอร์)",
          };
        }

        return {
          isClientOnly: false,
          modName: result.name,
          modLoader: "neoforge",
          reason:
            "มอด NeoForge นี้ไม่ได้ประกาศข้อจำกัด client-only และสามารถใช้กับเซิร์ฟเวอร์ได้",
        };
      }
    }

    // Try to find Forge mods.toml
    const forgeToml =
      zip.file("META-INF/mods.toml") || zip.file("META-INF/MODS.TOML");
    if (forgeToml) {
      const content = await forgeToml.async("text");
      const result = await parseForgeModsToml(content);

      if (result) {
        if (result.isClientOnly) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "forge",
            reason:
              "มอดนี้ประกาศตัวเองว่าเป็น CLIENT-ONLY ในไฟล์ mods.toml",
          };
        }

        // Check class structure for additional hints
        const classAnalysis = await analyzeClassFiles(zip);
        if (classAnalysis) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "forge",
            reason:
              "มอดนี้มีเฉพาะโค้ดฝั่งไคลเอนต์ (การเรนเดอร์, GUI, เชเดอร์)",
          };
        }

        return {
          isClientOnly: false,
          modName: result.name,
          modLoader: "forge",
          reason:
            "มอด Forge นี้ไม่ได้ประกาศข้อจำกัด client-only และสามารถใช้กับเซิร์ฟเวอร์ได้",
        };
      }
    }

    // Try to find Quilt quilt.mod.json (check before Fabric as Quilt mods often include fabric.mod.json for compatibility)
    const quiltJson = zip.file("quilt.mod.json");
    if (quiltJson) {
      const content = await quiltJson.async("text");
      const result = await parseQuiltModJson(content);

      if (result) {
        if (result.isClientOnly) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "quilt",
            reason:
              'มอดนี้ประกาศ environment: "client" ในไฟล์ quilt.mod.json',
          };
        }

        const classAnalysis = await analyzeClassFiles(zip);
        if (classAnalysis) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "quilt",
            reason:
              "มอดนี้มีเฉพาะโค้ดฝั่งไคลเอนต์ (การเรนเดอร์, GUI, เชเดอร์)",
          };
        }

        return {
          isClientOnly: false,
          modName: result.name,
          modLoader: "quilt",
          reason:
            "มอด Quilt นี้ไม่ได้ประกาศ environment เป็น client-only และสามารถใช้กับเซิร์ฟเวอร์ได้",
        };
      }
    }

    // Try to find Fabric fabric.mod.json
    const fabricJson = zip.file("fabric.mod.json");
    if (fabricJson) {
      const content = await fabricJson.async("text");
      const result = await parseFabricModJson(content);

      if (result) {
        if (result.isClientOnly) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "fabric",
            reason:
              'มอดนี้ประกาศ environment: "client" ในไฟล์ fabric.mod.json',
            detectedFiles,
          };
        }

        // Check class structure for additional hints
        const classAnalysis = await analyzeClassFiles(zip);
        if (classAnalysis) {
          return {
            isClientOnly: true,
            modName: result.name,
            modLoader: "fabric",
            reason:
              "มอดนี้มีเฉพาะโค้ดฝั่งไคลเอนต์ (การเรนเดอร์, GUI, เชเดอร์)",
            detectedFiles,
          };
        }

        return {
          isClientOnly: false,
          modName: result.name,
          modLoader: "fabric",
          reason:
            "มอด Fabric นี้ไม่ได้ประกาศ environment เป็น client-only และสามารถใช้กับเซิร์ฟเวอร์ได้",
          detectedFiles,
        };
      }
    }

    // Fallback: Analyze based on file structure
    const classAnalysis = await analyzeClassFiles(zip);
    const modName = file.name.replace(".jar", "");

    if (classAnalysis) {
      return {
        isClientOnly: true,
        modName,
        modLoader: "unknown",
        reason:
          "จากการวิเคราะห์โครงสร้างไฟล์ มอดนี้น่าจะเป็น client-side only",
      };
    }

    return {
      isClientOnly: false,
      modName,
      modLoader: "unknown",
      reason:
        "ไม่พบ metadata ของมอด จากการวิเคราะห์โครงสร้างไฟล์ มอดนี้น่าจะใช้กับเซิร์ฟเวอร์ได้",
    };
  } catch (error) {
    return {
      isClientOnly: false,
      modName: file.name,
      modLoader: "unknown",
      reason: `เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์: ${error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}`,
    };
  }
}
