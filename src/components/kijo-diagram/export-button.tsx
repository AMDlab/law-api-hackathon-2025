"use client";

import { useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";
import type { KijoDiagram } from "@/types/diagram";

interface ExportButtonProps {
  diagram: KijoDiagram;
  articleContent?: string;
  articleTitle?: string;
  flowRef: React.RefObject<HTMLDivElement | null>;
  onFitView?: () => void;
}

export function ExportButton({ diagram, articleContent, articleTitle, flowRef, onFitView }: ExportButtonProps) {
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

    // fitViewを実行してグラフ全体を表示
    if (onFitView) {
      onFitView();
      // fitViewアニメーション完了を待つ
      await new Promise(resolve => setTimeout(resolve, 300));
    }

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

  // PDF用: ヘッダー付きでキャプチャ
  const captureWithHeader = async (): Promise<string | null> => {
    if (!flowRef.current) return null;

    // fitViewを実行してグラフ全体を表示
    if (onFitView) {
      onFitView();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // ヘッダー要素を作成
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: white;
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      z-index: 100;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // 条文（一番上に配置）
    if (articleContent) {
      const articleWrapper = document.createElement('div');
      articleWrapper.style.cssText = 'margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;';

      const articleLabel = document.createElement('div');
      articleLabel.style.cssText = 'font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 8px;';
      articleLabel.textContent = articleTitle ? `【${articleTitle}】` : '【条文】';
      articleWrapper.appendChild(articleLabel);

      const article = document.createElement('div');
      article.style.cssText = 'font-size: 11px; color: #374151; white-space: pre-wrap; line-height: 1.5;';
      // 条文を短縮
      const shortContent = articleContent.length > 400 ? articleContent.substring(0, 400) + '...' : articleContent;
      article.textContent = shortContent;
      articleWrapper.appendChild(article);

      header.appendChild(articleWrapper);
    }

    // タイトル
    const title = document.createElement('div');
    title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 8px;';
    title.textContent = diagram.page_title.title;
    header.appendChild(title);

    // 対象主体
    if (diagram.page_title.target_subject) {
      const subject = document.createElement('div');
      subject.style.cssText = 'font-size: 12px; color: #6b7280; margin-bottom: 4px;';
      subject.textContent = `対象主体: ${diagram.page_title.target_subject}`;
      header.appendChild(subject);
    }

    // 説明
    if (diagram.page_title.description) {
      const desc = document.createElement('div');
      desc.style.cssText = 'font-size: 12px; color: #6b7280;';
      desc.textContent = diagram.page_title.description;
      header.appendChild(desc);
    }

    // エクスポートボタンとコントロールを非表示
    const exportBtn = flowRef.current.querySelector('.absolute.top-2.right-2') as HTMLElement;
    const controls = flowRef.current.querySelector('.react-flow__controls') as HTMLElement;
    if (exportBtn) exportBtn.style.display = 'none';
    if (controls) controls.style.display = 'none';

    // ヘッダーを追加
    flowRef.current.insertBefore(header, flowRef.current.firstChild);

    // React Flowのコンテンツを下にずらす
    const reactFlowWrapper = flowRef.current.querySelector('.react-flow') as HTMLElement;
    const headerHeight = header.offsetHeight;
    if (reactFlowWrapper) {
      reactFlowWrapper.style.marginTop = `${headerHeight}px`;
    }

    try {
      const dataUrl = await toPng(flowRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      return dataUrl;
    } finally {
      // 元に戻す
      header.remove();
      if (reactFlowWrapper) {
        reactFlowWrapper.style.marginTop = '';
      }
      if (exportBtn) exportBtn.style.display = '';
      if (controls) controls.style.display = '';
    }
  };

  // PDF書き出し（条文・タイトル付き、A4縦）
  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      // ヘッダー付きでキャプチャ
      const dataUrl = await captureWithHeader();
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

      // 上寄せで配置
      const x = (pageWidth - finalWidth) / 2;
      const y = margin;

      pdf.addImage(dataUrl, "PNG", x, y, finalWidth, finalHeight);
      pdf.save(getFileName("pdf"));
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF書き出しに失敗しました");
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  }, [flowRef, diagram, articleContent, onFitView]);

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
