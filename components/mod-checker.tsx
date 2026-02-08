"use client";

import { useState, useCallback, useRef } from "react";
import { analyzeModFile, type ModAnalysisResult } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileArchive,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Box,
  Github,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ModResult extends ModAnalysisResult {
  fileName: string;
}

export function ModChecker() {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ModResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(Array.from(files));
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(Array.from(files));
      }
    },
    []
  );

  const handleFiles = async (files: File[]) => {
    // Filter only .jar files
    const jarFiles = files.filter((file) =>
      file.name.toLowerCase().endsWith(".jar")
    );

    if (jarFiles.length === 0) {
      setErrorMessage("กรุณาอัพโหลดไฟล์ .jar เท่านั้น!");
      setShowErrorDialog(true);
      return;
    }

    if (jarFiles.length < files.length) {
      // Some files were filtered out
      setErrorMessage(
        `พบไฟล์ที่ไม่ใช่ .jar ${files.length - jarFiles.length} ไฟล์ จะตรวจสอบเฉพาะไฟล์ .jar เท่านั้น`
      );
      setShowErrorDialog(true);
    }

    setResults([]);
    setCurrentIndex(0);
    setIsAnalyzing(true);
    setTotalFiles(jarFiles.length);
    setProcessedFiles(0);
    setUploadProgress(0);

    const newResults: ModResult[] = [];

    for (let i = 0; i < jarFiles.length; i++) {
      const file = jarFiles[i];
      setCurrentFileName(file.name);
      setProcessedFiles(i);
      setUploadProgress(Math.round(((i + 0.5) / jarFiles.length) * 100));

      try {
        const formData = new FormData();
        formData.append("file", file);
        const analysisResult = await analyzeModFile(formData);
        newResults.push({
          ...analysisResult,
          fileName: file.name,
        });
      } catch (error) {
        newResults.push({
          isClientOnly: false,
          modName: file.name,
          modLoader: "unknown",
          reason: `Error: ${error instanceof Error ? error.message : "Failed to analyze file"}`,
          fileName: file.name,
        });
      }
    }

    setResults(newResults);
    setProcessedFiles(jarFiles.length);
    setUploadProgress(100);
    setIsAnalyzing(false);
    setShowResultDialog(true);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const resetChecker = () => {
    setResults([]);
    setCurrentIndex(0);
    setCurrentFileName(null);
    setUploadProgress(0);
    setTotalFiles(0);
    setProcessedFiles(0);
    setShowResultDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(results.length - 1, prev + 1));
  };

  const getModLoaderBadge = (loader: string) => {
    const colors: Record<string, string> = {
      forge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      neoforge: "bg-red-500/20 text-red-400 border-red-500/30",
      fabric: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      quilt: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      unknown: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    };
    return colors[loader] || colors.unknown;
  };

  const currentResult = results[currentIndex];

  // Count client-only mods
  const clientOnlyCount = results.filter((r) => r.isClientOnly).length;
  const serverCompatibleCount = results.length - clientOnlyCount;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Box className="h-12 w-12 text-emerald-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Minecraft Client Checker
              </h1>
            </div>
            <p className="text-zinc-400 text-lg">
              อัพโหลดไฟล์เพื่อตรวจสอบมอดสำหรับการลงในเซิร์ฟเวอร์
            </p>
          </div>

          {/* Upload Card */}
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-500" />
                อัพโหลดไฟล์ (รองรับหลายไฟล์)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop Zone */}
              <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                  transition-all duration-300 ease-out
                  ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jar"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />

                {isAnalyzing ? (
                  <div className="space-y-4">
                    <Loader2 className="h-12 w-12 mx-auto text-emerald-500 animate-spin" />
                    <div className="space-y-2">
                      <p className="text-zinc-300">
                        กำลังตรวจสอบ {currentFileName}...
                      </p>
                      <p className="text-zinc-500 text-sm">
                        {processedFiles} / {totalFiles} ไฟล์
                      </p>
                      <Progress value={uploadProgress} className="w-64 mx-auto" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className={`
                      inline-flex p-4 rounded-full transition-colors
                      ${isDragging ? "bg-emerald-500/20" : "bg-zinc-800"}
                    `}
                    >
                      <FileArchive
                        className={`h-12 w-12 ${isDragging ? "text-emerald-400" : "text-zinc-500"}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-zinc-300 font-medium">
                        {isDragging
                          ? "วางไฟล์ของคุณที่นี่!"
                          : "ลากหรือวางไฟล์ .jar ของคุณที่นี่"}
                      </p>
                      <p className="text-zinc-500 text-sm">
                        หรือคลิกเพื่อเลือกไฟล์ (สามารถเลือกหลายไฟล์ได้)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warning Note */}
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4" color="#ffc800" />
            <AlertDescription className="text-amber-300 text-sm">
              <strong>หมายเหตุ:</strong> เว็บไซด์นี้จะวิเคราะห์ MetaData ของมอดและโครงสร้างไฟล์
              อาจมีความผิดพลาดที่เกิดขึ้นได้
            </AlertDescription>
          </Alert>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-zinc-500 text-sm">
              เว็บไซด์นี้ถูกสร้างขึ้นโดย AI
            </p>
            <p className="text-zinc-600 text-xs">
              การทำงานอยู่บน Browser ของคุณเท่านั้น
            </p>
            <p>
              <Button
              variant="link"
              onClick={() => window.open("https://github.com/gunshiz/client-checker", "_blank")}
              className="text-[16px]"
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </p>
          </div>
        </div>
      </div>

      {/* Result Alert Dialog with Navigation */}
      <AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            {currentResult && (
              <>
                {/* Summary Bar */}
                {results.length > 1 && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <span className="text-emerald-400 flex items-center gap-2 cursor-pointer hover:underline">
                            <CheckCircle2 className="h-4 w-4" /> {serverCompatibleCount} ลงได้
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 bg-zinc-900 border-zinc-700">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              มอดที่สามารถลงได้
                            </h4>
                            <ScrollArea className="h-48">
                              <div className="space-y-1">
                                {results
                                  .filter((r) => !r.isClientOnly)
                                  .map((r, i) => (
                                    <div
                                      key={i}
                                      className="text-xs text-zinc-300 p-1.5 bg-zinc-800/50 rounded truncate"
                                      
                                    >
                                      {r.fileName}
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <span className="text-red-400 flex items-center gap-2 cursor-pointer hover:underline">
                            <XCircle className="h-4 w-4" /> {clientOnlyCount} ห้ามลง
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 bg-zinc-900 border-zinc-700">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              มอดที่ห้ามลง
                            </h4>
                            <ScrollArea className="h-48">
                              <div className="space-y-1">
                                {results
                                  .filter((r) => r.isClientOnly)
                                  .map((r, i) => (
                                    <div
                                      key={i}
                                      className="text-xs text-zinc-300 p-1.5 bg-zinc-800/50 rounded truncate"
                                      
                                    >
                                      {r.fileName}
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <span className="text-zinc-500 text-sm ml-2">
                      {currentIndex + 1} / {results.length}
                    </span>
                  </div>
                )}

                {/* Mod Info */}
                <div className="flex items-center gap-3 mb-4">
                  <Box className="h-10 w-10 text-zinc-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <AlertDialogTitle className="text-zinc-100 text-left text-sm break-all">
                      {currentResult.fileName}
                    </AlertDialogTitle>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getModLoaderBadge(currentResult.modLoader)}`}
                    >
                      {currentResult.modLoader === "unknown"
                        ? "Unknown Loader"
                        : currentResult.modLoader.charAt(0).toUpperCase() +
                          currentResult.modLoader.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Result */}
                <div
                  className={`w-full p-4 rounded-lg ${
                    currentResult.isClientOnly
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-emerald-500/10 border border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {currentResult.isClientOnly ? (
                      <>
                        <XCircle className="h-6 w-6 text-red-500" />
                        <span className="text-red-400 font-semibold text-xl">
                          ห้ามลงมอดนี้
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        <span className="text-emerald-400 font-semibold text-xl">
                          สามารถลงมอดนี้ได้
                        </span>
                      </>
                    )}
                  </div>
                  <AlertDialogDescription
                    className={
                      currentResult.isClientOnly ? "text-red-300/80" : "text-emerald-300/80"
                    }
                  >
                    {currentResult.reason}
                    <span className="block mt-2 text-sm opacity-75">
                      {currentResult.isClientOnly
                        ? "มอดที่ถูกสร้างมาให้ใช้สำหรับผู้เล่นเท่านั้น อาจสร้างปัญหาให้กับเซิร์ฟเวอร์"
                        : "มอดนี้สามารถใช้ได้สำหรับเซิร์ฟเวอร์ ไม่มีการสร้างปัญหาให้กับเซิร์ฟเวอร์"}
                    </span>
                  </AlertDialogDescription>
                </div>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {/* Navigation Buttons */}
            {results.length > 1 && (
              <div className="flex items-center justify-between w-full gap-2">
                <Button
                  variant="outline"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  onClick={goToNext}
                  disabled={currentIndex === results.length - 1}
                  className="flex-1"
                >
                  ถัดไป
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
            <AlertDialogAction onClick={resetChecker} className="w-full">
              ตรวจสอบมอดอื่นๆ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Alert Dialog for invalid file type */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-full">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <AlertDialogTitle className="text-red-400">
                ไฟล์ไม่ถูกต้อง
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-zinc-400">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowErrorDialog(false)}
              className="w-full"
            >
              ตกลง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
