"use client";

import { useState, useCallback, useMemo } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Download } from "lucide-react";
import type { KijoDiagram, FlowDiagram, PageTitle } from "@/types/diagram";

interface ExportButtonProps {
  diagram: KijoDiagram;
  flowDiagram?: FlowDiagram;
  isFlowMode?: boolean;
  articleContent?: string;
  articleTitle?: string;
  flowRef: React.RefObject<HTMLDivElement | null>;
  onFitView?: () => void;
}

/**
 * ヘッダー要素を構築するヘルパー関数
 */
function buildHeaderElement(
  pageTitle: PageTitle,
  articleContent?: string,
  articleTitle?: string,
  width?: string
): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    background: white;
    padding: 8px 12px;
    font-family: system-ui, -apple-system, sans-serif;
    ${width ? `width: ${width};` : ''}
  `;

  // 条文
  if (articleContent) {
    const articleWrapper = document.createElement('div');
    articleWrapper.style.cssText = 'margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;';

    const articleLabel = document.createElement('div');
    articleLabel.style.cssText = 'font-size: 12px; font-weight: bold; color: #111827; margin-bottom: 4px;';
    articleLabel.textContent = articleTitle ? `【${articleTitle}】` : '【条文】';
    articleWrapper.appendChild(articleLabel);

    const article = document.createElement('div');
    article.style.cssText = 'font-size: 9px; color: #374151; white-space: pre-wrap; line-height: 1.4;';
    const shortContent = articleContent.length > 300 ? articleContent.substring(0, 300) + '...' : articleContent;
    article.textContent = shortContent;
    articleWrapper.appendChild(article);

    container.appendChild(articleWrapper);
  }

  // タイトル
  const title = document.createElement('div');
  title.style.cssText = 'font-size: 14px; font-weight: bold; margin-bottom: 4px;';
  title.textContent = pageTitle.title;
  container.appendChild(title);

  // 対象主体
  if (pageTitle.target_subject) {
    const subject = document.createElement('div');
    subject.style.cssText = 'font-size: 10px; color: #6b7280; margin-bottom: 2px;';
    subject.textContent = `対象主体: ${pageTitle.target_subject}`;
    container.appendChild(subject);
  }

  // 説明
  if (pageTitle.description) {
    const desc = document.createElement('div');
    desc.style.cssText = 'font-size: 10px; color: #6b7280;';
    desc.textContent = pageTitle.description;
    container.appendChild(desc);
  }

  return container;
}

/**
 * 画像のロードをPromiseでラップ（タイムアウト付き）
 */
function loadImage(src: string, timeoutMs = 5000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Image load failed'));
    };
    img.src = src;
  });
}

export function ExportButton({ diagram, flowDiagram, isFlowMode, articleContent, articleTitle, flowRef, onFitView }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 現在表示中の図を取得
  const currentDiagram = useMemo(
    () => (isFlowMode && flowDiagram ? flowDiagram : diagram),
    [isFlowMode, flowDiagram, diagram]
  );
  const currentPageTitle = currentDiagram.page_title;

  // ファイル名を生成
  const getFileName = useCallback((ext: string) => {
    const id = currentDiagram.id || "diagram";
    return `${id}.${ext}`;
  }, [currentDiagram.id]);

  // 現在の表示状態でキャプチャ（PNG用）
  const captureCurrentView = useCallback(async (): Promise<string | null> => {
    if (!flowRef.current) return null;

    // fitViewを実行してグラフ全体を表示
    if (onFitView) {
      onFitView();
      // fitViewアニメーション完了を待つ
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // UIを非表示
    const exportBtn = flowRef.current.querySelector('.absolute.top-2.right-2') as HTMLElement;
    const controls = flowRef.current.querySelector('.react-flow__controls') as HTMLElement;
    const tabs = flowRef.current.querySelector('.absolute.top-2.left-2') as HTMLElement;
    if (exportBtn) exportBtn.style.display = 'none';
    if (controls) controls.style.display = 'none';
    if (tabs) tabs.style.display = 'none';

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
      if (tabs) tabs.style.display = '';
    }
  }, [flowRef, onFitView]);

  // ヘッダーのみを画像化
  const captureHeaderOnly = useCallback(async (): Promise<string | null> => {
    // ヘッダー用の一時的なコンテナを作成（画面内に配置、視覚的に隠す）
    const container = buildHeaderElement(currentPageTitle, articleContent, articleTitle, '800px');
    container.style.cssText += `
      position: absolute;
      top: 0;
      left: 0;
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
    `;

    document.body.appendChild(container);

    // レンダリング完了を待つ
    await new Promise(resolve => setTimeout(resolve, 100));

    // キャプチャ前にopacityを戻す
    container.style.opacity = '1';

    try {
      const dataUrl = await toPng(container, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      return dataUrl;
    } finally {
      container.remove();
    }
  }, [currentPageTitle, articleContent, articleTitle]);

  // PNG書き出し
  const exportPng = useCallback(async () => {
    setExporting(true);
    try {
      const dataUrl = await captureCurrentView();
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
  }, [captureCurrentView, getFileName]);

  // JSON書き出し（条文含む）
  const exportJson = useCallback(() => {
    const exportData = {
      ...currentDiagram,
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
  }, [currentDiagram, articleContent, getFileName]);

  // PDF書き出し（ヘッダー画像 + グラフ画像をA4縦に配置）
  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      // まずグラフをキャプチャ
      const graphDataUrl = await captureCurrentView();
      if (!graphDataUrl) return;

      // 次にヘッダーをキャプチャ
      const headerDataUrl = await captureHeaderOnly();

      // PDF作成（A4縦）
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      let currentY = margin;

      // ヘッダー画像を配置
      if (headerDataUrl) {
        const headerImg = await loadImage(headerDataUrl);
        const headerAspect = headerImg.width / headerImg.height;
        const headerWidth = pageWidth - margin * 2;
        const headerHeight = headerWidth / headerAspect;

        pdf.addImage(headerDataUrl, "PNG", margin, currentY, headerWidth, headerHeight);
        currentY += headerHeight + 2;
      }

      // グラフ画像を配置
      const graphImg = await loadImage(graphDataUrl);
      const graphAspect = graphImg.width / graphImg.height;
      const maxGraphWidth = pageWidth - margin * 2;
      const maxGraphHeight = pageHeight - currentY - margin;

      let graphWidth = maxGraphWidth;
      let graphHeight = maxGraphWidth / graphAspect;

      if (graphHeight > maxGraphHeight) {
        graphHeight = maxGraphHeight;
        graphWidth = maxGraphHeight * graphAspect;
      }

      // グラフを左右中央に配置
      const graphX = (pageWidth - graphWidth) / 2;
      pdf.addImage(graphDataUrl, "PNG", graphX, currentY, graphWidth, graphHeight);

      pdf.save(getFileName("pdf"));
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF書き出しに失敗しました");
    } finally {
      setExporting(false);
      setIsOpen(false);
    }
  }, [captureCurrentView, captureHeaderOnly, getFileName]);

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
