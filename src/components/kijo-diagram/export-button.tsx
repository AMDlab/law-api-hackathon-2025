"use client";

import { useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";
import type { KijoDiagram } from "@/types/diagram";

interface ExportButtonProps {
  diagram: KijoDiagram;
  articleContent?: string;
  flowRef: React.RefObject<HTMLDivElement | null>;
}

export function ExportButton({ diagram, articleContent, flowRef }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ファイル名を生成
  const getFileName = (ext: string) => {
    const id = diagram.id || "diagram";
    return `${id}.${ext}`;
  };

  // 書き出しボタンを非表示にしてキャプチャを取得
  const captureWithoutUI = async (): Promise<string | null> => {
    if (!flowRef.current) return null;

    // エクスポートボタンとコントロールを一時的に非表示
    const exportBtn = flowRef.current.querySelector('.absolute.top-2.right-2') as HTMLElement;
    const controls = flowRef.current.querySelector('.react-flow__controls') as HTMLElement;

    if (exportBtn) exportBtn.style.display = 'none';
    if (controls) controls.style.display = 'none';

    try {
      const dataUrl = await toPng(flowRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      return dataUrl;
    } finally {
      // 元に戻す
      if (exportBtn) exportBtn.style.display = '';
      if (controls) controls.style.display = '';
    }
  };

  // PNG書き出し
  const exportPng = useCallback(async () => {
    setExporting(true);
    try {
      const dataUrl = await captureWithoutUI();
      if (!dataUrl) return;

      const link = document.createElement("a");
      link.download = getFileName("png");
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
      alert("PNG書き出しに失敗しました");
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  }, [flowRef, diagram.id]);

  // JSON書き出し（条文含む）
  const exportJson = useCallback(() => {
    const exportData = {
      ...diagram,
      articleContent: articleContent || null,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = getFileName("json");
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }, [diagram, articleContent]);

  // PDF書き出し（機序図画像のみ、A4縦）
  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      // 機序図をPNG化（UIなし）
      const dataUrl = await captureWithoutUI();
      if (!dataUrl) return;

      // PDF作成（A4縦）
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // 画像のアスペクト比を維持して配置
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const aspectRatio = img.width / img.height;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      let finalWidth = maxWidth;
      let finalHeight = maxWidth / aspectRatio;

      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * aspectRatio;
      }

      // 中央に配置
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(dataUrl, "PNG", x, y, finalWidth, finalHeight);
      pdf.save(getFileName("pdf"));
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF書き出しに失敗しました");
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  }, [flowRef, diagram]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
        title="書き出し"
      >
        <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-50 min-w-[80px]">
          <button
            onClick={exportPng}
            className="w-full px-3 py-2 text-sm hover:bg-gray-100 text-left"
          >
            PNG
          </button>
          <button
            onClick={exportPdf}
            className="w-full px-3 py-2 text-sm hover:bg-gray-100 text-left"
          >
            PDF
          </button>
          <button
            onClick={exportJson}
            className="w-full px-3 py-2 text-sm hover:bg-gray-100 text-left"
          >
            JSON
          </button>
        </div>
      )}

      {/* クリックアウトで閉じる */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
