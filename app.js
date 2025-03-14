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
    const offsetOption = document.getElementById('offset-option');
    const aggregatePeriod = document.getElementById('aggregate-period');

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
    fileInput.addEventListener('change', function () {
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
        reader.onload = function (e) {
            csvData = e.target.result;
            parseCSV(csvData);
        };
        reader.onerror = function () {
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

        console.log({ parsedTransactions });

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

        // 通貨を番号順にソートするための配列を作成
        const currencyArray = Array.from(currencies).map(currency => {
            // 通貨コードと番号を分離（例: "BTC;1" -> {code: "BTC", number: 1}）
            const parts = currency.split(';');
            const code = parts[0];
            // 番号部分が存在する場合は数値に変換、存在しない場合は無限大（最後に表示）
            const number = parts.length > 1 ? parseInt(parts[1], 10) : Infinity;

            return {
                original: currency,
                code: code,
                number: isNaN(number) ? Infinity : number
            };
        });

        // 番号順にソート
        currencyArray.sort((a, b) => a.number - b.number);

        // ソートされた通貨でフィルターを生成
        currencyArray.forEach(currencyObj => {
            const currency = currencyObj.original;
            const checkbox = document.createElement('label');
            checkbox.className = 'currency-checkbox';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = currency;
            input.checked = true;
            selectedCurrencies.add(currency);

            input.addEventListener('change', function () {
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

        // シーケンス図生成のための前処理
        const transactions = filteredTransactions.map(transaction => {
            // utils.js で使用するフォーマットに変換
            return {
                'Years (Date (UTC))': new Date(transaction.date).getFullYear(),
                'From Wallet (read-only)': transaction.from,
                'To Wallet (read-only)': transaction.to,
                'From Currency': transaction.fromCurrency,
                'To Currency': transaction.toCurrency,
                'Sum of From Amount': parseFloat(transaction.fromAmount) || 0,
                'Sum of To Amount': parseFloat(transaction.toAmount) || 0
            };
        });

        // UIのオプション設定を読み取る
        const selectedPeriod = aggregatePeriod.value;
        const options = {
            offset: selectedPeriod !== 'none' && offsetOption.checked, // まとめない場合は相殺も無効
            aggregatePeriod: selectedPeriod, // 取引をまとめる期間（none, day, month, year）
        };

        // まとめない場合は相殺オプションを無効化
        if (selectedPeriod === 'none') {
            offsetOption.checked = false;
            offsetOption.disabled = true;
        } else {
            offsetOption.disabled = false;
        }

        // utils.jsの関数を使用してシーケンス図を生成
        const mermaidCode = window.utils.generateSequenceDiagram(
            transactions,
            options
        );
        console.log({ mermaidCode });

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
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
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

    // aggregatePeriodの変更イベントリスナー
    aggregatePeriod.addEventListener('change', function () {
        // まとめない場合は相殺オプションを無効化
        if (this.value === 'none') {
            offsetOption.checked = false;
            offsetOption.disabled = true;
        } else {
            offsetOption.disabled = false;
        }
    });

    // イベントリスナーの設定
    generateDiagramBtn.addEventListener('click', generateSequenceDiagram);
    backToStep1Btn.addEventListener('click', () => goToStep(1));
    backToStep2Btn.addEventListener('click', () => goToStep(2));
    downloadDiagramBtn.addEventListener('click', downloadSVG);
    openMermaidLiveBtn.addEventListener('click', openInMermaidLive);
});