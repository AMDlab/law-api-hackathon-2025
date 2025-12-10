"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        title="機序図の読み方"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* モーダル本体 */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl max-h-[80vh] overflow-y-auto m-4">
            {/* ヘッダー */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">審査機序図の読み方</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="px-6 py-4 space-y-6">
              {/* 概要 */}
              <section>
                <p className="text-sm text-gray-700">
                  審査機序図は、建築確認における規制文の適否判定プロセスを視覚化したものです。
                  左から右へ情報と処理が流れ、最終的に規制文への適否が判定されます。
                </p>
              </section>

              {/* ノードの種類 */}
              <section>
                <h3 className="font-semibold mb-3">ノードの種類</h3>
                <div className="space-y-3">
                  {/* 情報ノード */}
                  <div className="flex items-start gap-3">
                    <div className="w-24 h-10 border-2 border-gray-300 bg-white rounded flex items-center justify-center text-xs flex-shrink-0">
                      情報
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">[情報] - 矩形</div>
                      <div className="text-gray-600">
                        審査に必要なデータや判定結果を表します。
                      </div>
                    </div>
                  </div>

                  {/* 処理ノード */}
                  <div className="flex items-start gap-3">
                    <div className="w-24 h-10 border-2 border-gray-300 bg-white rounded-xl flex items-center justify-center text-xs flex-shrink-0">
                      処理
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">[処理] - 角丸矩形</div>
                      <div className="text-gray-600">
                        情報を変換・判定する処理を表します。
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 情報ノードの色 */}
              <section>
                <h3 className="font-semibold mb-3">[情報]の色</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-gray-300 bg-white rounded"></div>
                    <span className="text-sm">通常の情報</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-orange-300 bg-orange-50 rounded"></div>
                    <span className="text-sm">目視認識情報（図面等）</span>
                  </div>
                </div>
              </section>

              {/* 処理ノードの色 */}
              <section>
                <h3 className="font-semibold mb-3">[処理]の色</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-cyan-400 bg-cyan-50 rounded-lg"></div>
                    <span className="text-sm">機械的処理</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-orange-300 bg-orange-50 rounded-lg"></div>
                    <span className="text-sm">人の認識・判断</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-green-400 bg-green-50 rounded-lg"></div>
                    <span className="text-sm">整合確認</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-amber-400 bg-amber-50 rounded-lg"></div>
                    <span className="text-sm">入力情報不定</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-gray-400 bg-gray-100 rounded-lg"></div>
                    <span className="text-sm">部分審査機序図参照</span>
                  </div>
                </div>
              </section>

              {/* エッジ */}
              <section>
                <h3 className="font-semibold mb-3">矢印（エッジ）</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-0.5 bg-gray-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-500 border-y-4 border-y-transparent"></div>
                    </div>
                    <span className="text-sm">通常の入力（処理への入力）</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-0.5 bg-green-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-green-500 border-y-4 border-y-transparent"></div>
                    </div>
                    <span className="text-sm">補助入力（参照情報）</span>
                  </div>
                </div>
              </section>

              {/* マーク */}
              <section>
                <h3 className="font-semibold mb-3">特殊マーク</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 border-2 border-gray-300 rounded">
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-200 border border-gray-400 rounded-sm"></div>
                    </div>
                    <span className="text-sm">複数マーク（複数の対象に対する情報）</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 border-2 border-gray-300 rounded-xl">
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-200 border border-gray-400 rounded-full"></div>
                    </div>
                    <span className="text-sm">反復マーク（繰り返し処理）</span>
                  </div>
                </div>
              </section>

              {/* 記号 */}
              <section>
                <h3 className="font-semibold mb-3">記号（シンボル）</h3>
                <p className="text-sm text-gray-700 mb-2">
                  [情報]ノードには論理式で使用する記号（A, B, X1など）が付与されることがあります。
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-2 py-1 border-2 border-gray-300 bg-white rounded text-xs">
                    <span className="text-blue-600 mr-1">[A]</span>敷地面積
                  </div>
                  <span className="text-sm text-gray-600">← 記号Aが付与された情報</span>
                </div>
                <p className="text-xs text-gray-500">
                  処理ノードの「論理式」では、これらの記号を用いて処理内容を表現します（例: A ≧ B）
                </p>
              </section>

              {/* 性質の型 */}
              <section>
                <h3 className="font-semibold mb-3">性質の型（情報の種類）</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">命題真偽</span>
                    <span className="text-gray-600">真/偽の判定結果</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">区分情報</span>
                    <span className="text-gray-600">カテゴリ分類</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">数値</span>
                    <span className="text-gray-600">数量・寸法など</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">幾何学的情報</span>
                    <span className="text-gray-600">点/線/面/立体</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">集合定義</span>
                    <span className="text-gray-600">対象物の集合</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">視認情報</span>
                    <span className="text-gray-600">図面等の目視情報</span>
                  </div>
                </div>
              </section>

              {/* 主体と性質 */}
              <section>
                <h3 className="font-semibold mb-3">主体と性質</h3>
                <p className="text-sm text-gray-700 mb-2">
                  [情報]は「主体」が持つ「性質」を表します。
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="mb-1"><span className="font-medium">例:</span> 「建築物の高さ」</div>
                  <div className="text-gray-600 text-xs">
                    • 主体: 建築物<br/>
                    • 性質: 高さ<br/>
                    • 性質の型: 数値
                  </div>
                </div>
              </section>

              {/* フローの読み方 */}
              <section>
                <h3 className="font-semibold mb-3">フローの読み方</h3>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>左端の[情報]から開始します（入力データ）</li>
                  <li>矢印に沿って右へ進み、[処理]で変換・判定されます</li>
                  <li>最終的に右端で規制文への適否が判定されます</li>
                </ol>
              </section>

              {/* 詳細パネル */}
              <section>
                <h3 className="font-semibold mb-3">詳細パネル</h3>
                <p className="text-sm text-gray-700 mb-3">
                  ノードをクリックすると、右側のパネルに詳細情報が表示されます。
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b">
                    <span className="text-xs text-gray-500">詳細パネルの例</span>
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">タイプ</span>
                      <span>情報</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">記号</span>
                      <span className="text-blue-600">A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">主体</span>
                      <span>建築物</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">性質</span>
                      <span>高さ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">性質の型</span>
                      <span className="bg-gray-100 px-1 rounded">数値</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="text-gray-500 mb-1">説明</div>
                      <div className="text-gray-700">地盤面からの建築物の高さ</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 出典 */}
              <section className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  出典: buildingSMART Japan「審査機序図作成手引書」
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
