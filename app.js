document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const steps = document.querySelectorAll('.step');
    const stepContents = document.querySelectorAll('.step-content');
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const currencyFilter = document.getElementById('currency-filter');
    const generateDiagramBtn = document.getElementById('generate-diagram');
    const backToStep1Btn = document.getElementById('back-to-step1');
    const backToStep2Btn = document.getElementById('back-to-step2');
    const downloadDiagramBtn = document.getElementById('download-diagram');
    const openMermaidLiveBtn = document.getElementById('open-mermaid-live');
    const diagramPreview = document.getElementById('diagram-preview');

    // グローバル変数
    let csvData = null;
    let parsedTransactions = [];
    let selectedCurrencies = new Set();
    let generatedDiagram = '';

    // Mermaidの初期化
    mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
    });

    // ステップ遷移関数
    function goToStep(stepNumber) {
        steps.forEach((step, index) => {
            if (index < stepNumber - 1) {
                step.classList.remove('active');
                step.classList.add('completed');
            } else if (index === stepNumber - 1) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });

        stepContents.forEach((content, index) => {
            content.classList.toggle('active', index === stepNumber - 1);
        });
    }

    // ドラッグ&ドロップイベントの設定
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // ファイルドロップ処理
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // ファイル選択処理
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    // ファイル処理
    function handleFiles(files) {
        if (files.length) {
            const file = files[0];
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
                readCSVFile(file);
            } else {
                fileInfo.textContent = 'エラー: CSVファイルを選択してください。';
            }
        }
    }

    // ファイルサイズのフォーマット
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    // CSVファイルの読み込み
    function readCSVFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            csvData = e.target.result;
            parseCSV(csvData);
        };
        reader.onerror = function() {
            fileInfo.textContent = 'ファイルの読み込み中にエラーが発生しました。';
        };
        reader.readAsText(file);
    }

    // CSVデータの解析（基本的な実装、後で詳細なロジックに置き換え）
    function parseCSV(csv) {
        // CSVヘッダーとデータ行に分割
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        // KoinlyのCSVかどうかを判定（utils.jsの関数を使用）
        if (!window.utils.isKoinlyCSV(headers)) {
            fileInfo.textContent = 'エラー: Koinlyのトランザクションデータではありません。';
            return;
        }
        
        // 必要なヘッダーのインデックスを取得
        const dateIndex = headers.indexOf('Date (UTC)');
        const typeIndex = headers.indexOf('Type');
        const fromAmountIndex = headers.indexOf('From Amount');
        const fromCurrencyIndex = headers.indexOf('From Currency');
        const toAmountIndex = headers.indexOf('To Amount');
        const toCurrencyIndex = headers.indexOf('To Currency');
        const fromWalletIndex = headers.indexOf('From Wallet (read-only)');
        const toWalletIndex = headers.indexOf('To Wallet (read-only)');
        
        // ヘッダーが見つからない場合はエラー（念のため確認）
        if (dateIndex === -1 || typeIndex === -1 ||
            fromAmountIndex === -1 || fromCurrencyIndex === -1 ||
            toAmountIndex === -1 || toCurrencyIndex === -1) {
            fileInfo.textContent = 'エラー: CSVファイルの形式が正しくありません。';
            return;
        }
        
        // データ行を解析
        parsedTransactions = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // カンマで分割（引用符内のカンマを考慮）
            const values = lines[i].split(',').map(value => value.trim());
            
            if (values.length >= Math.min(fromWalletIndex, toWalletIndex) + 1) {
                const transaction = {
                    date: values[dateIndex],
                    type: values[typeIndex],
                    from: values[fromWalletIndex] || '',
                    to: values[toWalletIndex] || '',
                    fromAmount: values[fromAmountIndex] || '0',
                    fromCurrency: values[fromCurrencyIndex] || '',
                    toAmount: values[toAmountIndex] || '0',
                    toCurrency: values[toCurrencyIndex] || ''
                };
                
                // 通貨情報を設定（表示用）
                // fromCurrencyが存在する場合はそれを使用、なければtoCurrencyを使用
                transaction.currency = transaction.fromCurrency || transaction.toCurrency;
                
                parsedTransactions.push(transaction);
            }
        }
        
        // 通貨フィルターの生成
        generateCurrencyFilter();
        
        // ステップ2に進む
        goToStep(2);
    }

    // 通貨フィルターの生成
    function generateCurrencyFilter() {
        // 通貨の一覧を取得
        const currencies = new Set();
        parsedTransactions.forEach(transaction => {
            if (transaction.currency) {
                currencies.add(transaction.currency);
            }
        });
        
        // 通貨フィルターのHTML生成
        currencyFilter.innerHTML = '';
        if (currencies.size === 0) {
            currencyFilter.innerHTML = '<p>通貨情報が見つかりませんでした。</p>';
            return;
        }
        
        currencies.forEach(currency => {
            const checkbox = document.createElement('label');
            checkbox.className = 'currency-checkbox';
            
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = currency;
            input.checked = true;
            selectedCurrencies.add(currency);
            
            input.addEventListener('change', function() {
                if (this.checked) {
                    selectedCurrencies.add(currency);
                } else {
                    selectedCurrencies.delete(currency);
                }
            });
            
            checkbox.appendChild(input);
            checkbox.appendChild(document.createTextNode(currency));
            currencyFilter.appendChild(checkbox);
        });
    }

    // シーケンス図の生成
    function generateSequenceDiagram() {
        // 選択された通貨でトランザクションをフィルタリング
        const filteredTransactions = parsedTransactions.filter(transaction =>
            selectedCurrencies.has(transaction.currency)
        );
        
        if (filteredTransactions.length === 0) {
            alert('選択された通貨のトランザクションがありません。');
            return;
        }
        
        // シーケンス図のMermaid構文を生成（基本的な実装、後で詳細なロジックに置き換え）
        let mermaidCode = 'sequenceDiagram\n';
        
        // 参加者（ユニークなfromとto）を追加
        const participants = new Set();
        filteredTransactions.forEach(transaction => {
            if (transaction.from) participants.add(transaction.from);
            if (transaction.to) participants.add(transaction.to);
        });
        
        participants.forEach(participant => {
            mermaidCode += `    participant ${participant}\n`;
        });
        
        // トランザクションをシーケンスに変換
        filteredTransactions.forEach(transaction => {
            if (transaction.from && transaction.to) {
                // トランザクションタイプに応じて適切な金額と通貨を選択
                let amount, currency;
                
                switch (transaction.type.toLowerCase()) {
                    case 'deposit':
                        amount = parseFloat(transaction.toAmount);
                        currency = transaction.toCurrency;
                        break;
                    case 'withdrawal':
                        amount = parseFloat(transaction.fromAmount);
                        currency = transaction.fromCurrency;
                        break;
                    case 'trade':
                        amount = parseFloat(transaction.toAmount);
                        currency = transaction.toCurrency;
                        break;
                    case 'transfer':
                        amount = parseFloat(transaction.fromAmount);
                        currency = transaction.fromCurrency;
                        break;
                    default:
                        amount = parseFloat(transaction.fromAmount) || parseFloat(transaction.toAmount);
                        currency = transaction.currency;
                }
                
                const sign = amount >= 0 ? '+' : '';
                mermaidCode += `    ${transaction.from}->>+${transaction.to}: ${sign}${amount} ${currency} (${transaction.type})\n`;
            }
        });
        
        // 生成されたコードを保存
        generatedDiagram = mermaidCode;
        
        // プレビューを表示
        diagramPreview.innerHTML = `<div class="mermaid">${mermaidCode}</div>`;
        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        
        // ステップ3に進む
        goToStep(3);
    }

    // SVGのダウンロード
    function downloadSVG() {
        const svgElement = diagramPreview.querySelector('svg');
        if (!svgElement) {
            alert('シーケンス図が生成されていません。');
            return;
        }
        
        // SVGをシリアライズ
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);
        
        // SVGのXMLを修正
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        
        // Blobを作成
        const blob = new Blob([source], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        
        // ダウンロードリンクを作成
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'sequence-diagram.svg';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    // Mermaid Liveで開く
    function openInMermaidLive() {
        if (!generatedDiagram) {
            alert('シーケンス図が生成されていません。');
            return;
        }
        
        // エンコードしたダイアグラムをURLに埋め込む
        const encoded = encodeURIComponent(generatedDiagram);
        const url = `https://mermaid.live/view#pako:${pako_deflate_base64(generatedDiagram)}`;
        window.open(url, '_blank');
    }

    // Base64エンコードされたdeflateされた文字列を生成（Mermaid Liveで使用）
    function pako_deflate_base64(str) {
        // テキストをUTF8バイト配列に変換
        const strUtf8 = new TextEncoder().encode(str);
        // pakoを使用して圧縮
        const compressed = pako.deflate(strUtf8, { level: 9 });
        // Base64エンコード
        return btoa(String.fromCharCode.apply(null, compressed));
    }

    // イベントリスナーの設定
    generateDiagramBtn.addEventListener('click', generateSequenceDiagram);
    backToStep1Btn.addEventListener('click', () => goToStep(1));
    backToStep2Btn.addEventListener('click', () => goToStep(2));
    downloadDiagramBtn.addEventListener('click', downloadSVG);
    openMermaidLiveBtn.addEventListener('click', openInMermaidLive);
});