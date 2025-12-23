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
                <h3 className="font-semibold mb-2">審査機序図とは</h3>
                <p className="text-sm text-gray-700">
                  審査機序図は、建築確認申請における計画案件の<strong>法適合判定における情報処理のメカニズム</strong>を表現するための図式です。
                  左から右へ[情報]と[処理]が流れ、最終的に規制文への適否が判定されます。
                </p>
              </section>

              {/* 構成要素 */}
              <section>
                <h3 className="font-semibold mb-3">構成要素</h3>
                <div className="space-y-3">
                  {/* 情報ノード */}
                  <div className="flex items-start gap-3">
                    <div className="w-24 h-10 border-2 border-gray-300 bg-white rounded flex items-center justify-center text-xs flex-shrink-0">
                      情報
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">[情報] - 長方形</div>
                      <div className="text-gray-600">
                        審査に必要なデータや判定結果を表します。
                        <strong>主体</strong>（建築物、室、敷地など）と<strong>性質</strong>（高さ、面積など）で構成されます。
                      </div>
                    </div>
                  </div>

                  {/* 処理ノード */}
                  <div className="flex items-start gap-3">
                    <div className="w-24 h-10 border-2 border-gray-300 bg-white rounded-xl flex items-center justify-center text-xs flex-shrink-0">
                      処理
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">[処理] - 角丸長方形</div>
                      <div className="text-gray-600">
                        情報を変換・判定する処理を表します。
                        [情報]からのインプットを受けて、新たな[情報]をアウトプットします。
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 情報の性質の型 */}
              <section>
                <h3 className="font-semibold mb-3">[情報]の性質の型</h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                      <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">命題真偽</span>
                      <span className="text-gray-600">真か偽かが判定可能な事実（例: 技術基準を満たすか否か）</span>
                    </div>
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                      <span className="font-mono text-xs bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0">区分情報</span>
                      <span className="text-gray-600">既定の区分のいずれか（例: 用途地域、建物用途コード）</span>
                    </div>
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                      <span className="font-mono text-xs bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0">数値</span>
                      <span className="text-gray-600">整数値または実数値（例: 延べ面積、高さ）</span>
                    </div>
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                      <span className="font-mono text-xs bg-cyan-100 px-1.5 py-0.5 rounded flex-shrink-0">幾何学概念</span>
                      <span className="text-gray-600">点/方向/線形状/面形状/ソリッド（例: 敷地境界線、延焼のおそれのある部分）</span>
                    </div>
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                      <span className="font-mono text-xs bg-yellow-100 px-1.5 py-0.5 rounded flex-shrink-0">集合定義</span>
                      <span className="text-gray-600">特定の関係にある主体の集合（例: 階に属する外壁の集合）</span>
                    </div>
                    <div className="flex items-start gap-2 bg-orange-50 p-2 rounded border border-orange-200">
                      <span className="font-mono text-xs bg-orange-100 px-1.5 py-0.5 rounded flex-shrink-0">視認情報</span>
                      <span className="text-gray-600">人による総合的認識・判断が必要（例: 告示仕様適合判断のための断面詳細図）</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 処理の種類 */}
              <section>
                <h3 className="font-semibold mb-3">[処理]の種類</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-cyan-400 bg-cyan-50 rounded-lg flex-shrink-0"></div>
                    <div className="text-sm">
                      <span className="font-medium">機械的処理</span>
                      <span className="text-gray-500 ml-1">- 自動化可能な論理演算や計算（視認情報は接続不可）</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-orange-300 bg-orange-50 rounded-lg flex-shrink-0"></div>
                    <div className="text-sm">
                      <span className="font-medium">人の認識・判断</span>
                      <span className="text-gray-500 ml-1">- 人の認識/判断を要する処理</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-green-400 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px]">☑</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">整合確認</span>
                      <span className="text-gray-500 ml-1">- 異なる情報源からの複数情報を比較・整合確認</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-gray-400 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px]">+</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">部分機序図参照</span>
                      <span className="text-gray-500 ml-1">- 別の機序図の処理全体を参照</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-amber-400 bg-amber-50 rounded-lg border-l-0 flex-shrink-0"></div>
                    <div className="text-sm">
                      <span className="font-medium">入力情報不定</span>
                      <span className="text-gray-500 ml-1">- 情報源の所在や手続きも含め人が判断（インプットなし）</span>
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
                    <span className="text-sm">視認情報（図面等）</span>
                  </div>
                </div>
              </section>

              {/* エッジ */}
              <section>
                <h3 className="font-semibold mb-3">矢印（エッジ）</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-0.5 bg-blue-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-blue-500 border-y-4 border-y-transparent"></div>
                    </div>
                    <span className="text-sm">[情報]→[処理]へのインプット</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-0.5 bg-red-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-red-500 border-y-4 border-y-transparent"></div>
                    </div>
                    <span className="text-sm">[処理]→[情報]へのアウトプット</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-0.5 bg-green-500 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-green-500 border-y-4 border-y-transparent"></div>
                    </div>
                    <span className="text-sm">裏付け情報（整合確認の補助入力）</span>
                  </div>
                </div>
              </section>

              {/* 複数主体と反復処理 */}
              <section>
                <h3 className="font-semibold mb-3">複数主体と反復処理</h3>
                <p className="text-sm text-gray-700 mb-2">
                  複数の主体についての情報や、複数の主体を対象とする反復処理は<strong>二重線</strong>で表示されます。
                </p>
                <div className="flex items-center gap-4">
                  <div className="relative w-10 h-8 border-2 border-gray-300 rounded">
                    <div className="absolute -top-1 -right-1 w-full h-full border-2 border-gray-300 rounded bg-white"></div>
                  </div>
                  <span className="text-sm text-gray-600">複数の対象に対する情報/反復処理</span>
                </div>
              </section>

              {/* 主体と性質 */}
              <section>
                <h3 className="font-semibold mb-3">主体と性質</h3>
                <p className="text-sm text-gray-700 mb-2">
                  [情報]は「<strong>主体</strong>」が持つ「<strong>性質</strong>」を表します。
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="mb-2"><span className="font-medium">例:</span> 「建築物の高さ」</div>
                  <div className="text-gray-600 text-xs space-y-1">
                    <div><span className="font-medium">主体:</span> 建築物（数えることができるもの）</div>
                    <div><span className="font-medium">性質:</span> 高さ（主体の属性）</div>
                    <div><span className="font-medium">性質の型:</span> 数値</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ※法令の知識や都市計画情報などの公共データは[情報]ではなく[処理]に含まれます
                </p>
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
                    <div className="font-bold text-sm mb-2">建築物の高さ</div>
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
                      <span className="bg-green-100 px-1 rounded">数値</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="text-gray-500 mb-1">説明</div>
                      <div className="text-gray-700">地盤面からの建築物の高さ</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 適合判定フロー図 */}
              <section>
                <h3 className="font-semibold mb-3">適合判定フロー図</h3>
                <p className="text-sm text-gray-700 mb-2">
                  機序図を元に作成された判定フローチャートです。「フロー図」タブで表示できます。
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 border-2 border-blue-400 bg-blue-50 rounded-full flex items-center justify-center text-[8px]">開始</div>
                    <span className="text-sm text-gray-600">開始/終了ノード</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 border-2 border-yellow-400 bg-yellow-50 rotate-45 flex items-center justify-center">
                      <span className="text-[8px] -rotate-45">?</span>
                    </div>
                    <span className="text-sm text-gray-600">判定ノード（Yes/Noで分岐）</span>
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
