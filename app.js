document.addEventListener('DOMContentLoaded', () => {
    // 言語設定の初期化
    if (window.utils && window.utils.updatePageLanguage) {
        // デフォルトで英語を設定
        window.__currentLanguage = 'en';

        // HTML要素のlang属性を設定
        document.documentElement.lang = 'en';

        // ページ全体の言語を更新
        window.utils.updatePageLanguage();

        // 言語切り替えボタンを追加
        addLanguageSwitcher();
    }

    // DOM要素の取得
    const steps = document.querySelectorAll('.step');
    const stepContents = document.querySelectorAll('.step-content');
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const csvTextInput = document.getElementById('csv-text-input');
    const processCSVTextBtn = document.getElementById('process-csv-text');
    const textInfo = document.getElementById('text-info');
    const fileUploadTab = document.getElementById('file-upload-tab');
    const textInputTab = document.getElementById('text-input-tab');
    const fileUploadContent = document.getElementById('file-upload-content');
    const textInputContent = document.getElementById('text-input-content');
    const currencyFilter = document.getElementById('currency-filter');
    const generateDiagramBtn = document.getElementById('generate-diagram');
    const backToStep1Btn = document.getElementById('back-to-step1');
    const backToStep2Btn = document.getElementById('back-to-step2');
    const downloadDiagramBtn = document.getElementById('download-diagram');
    const copyDiagramCodeBtn = document.getElementById('copy-diagram-code');
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

    // タブ切り替え処理
    fileUploadTab.addEventListener('click', function () {
        fileUploadTab.classList.add('active');
        textInputTab.classList.remove('active');
        fileUploadContent.classList.add('active');
        textInputContent.classList.remove('active');
    });

    textInputTab.addEventListener('click', function () {
        textInputTab.classList.add('active');
        fileUploadTab.classList.remove('active');
        textInputContent.classList.add('active');
        fileUploadContent.classList.remove('active');
    });

    // ファイル選択処理
    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    // CSVテキスト処理ボタン
    processCSVTextBtn.addEventListener('click', function () {
        const text = csvTextInput.value.trim();
        if (text) {
            processCSVText(text);
        } else {
            textInfo.textContent = window.utils.translate('Error: Please enter CSV data.');
        }
    });

    // CSVテキスト処理
    function processCSVText(text) {
        textInfo.textContent = window.utils.translate('Processing CSV data...');
        try {
            csvData = text;
            parseCSV(csvData);
            textInfo.textContent = window.utils.translate('CSV data processing completed.');
        } catch (error) {
            textInfo.textContent = `${window.utils.translate('Error:')} ${error.message}`;
            console.error('CSV処理エラー:', error);
        }
    }

    // ファイル処理
    function handleFiles(files) {
        if (files.length) {
            const file = files[0];
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
                readCSVFile(file);
            } else {
                fileInfo.textContent = window.utils.translate('Error: Please select a CSV file.');
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
            fileInfo.textContent = window.utils.translate('Error reading file.');
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
            fileInfo.textContent = window.utils.translate('Error: Not a Koinly transaction data.');
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
            currencyFilter.innerHTML = `<p>${window.utils.translate('No currency information found.')}</p>`;
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
            alert(window.utils.translate('No transactions found for selected currencies.'));
            return;
        }

        // シーケンス図生成のための前処理
        const transactions = filteredTransactions.map(transaction => {
            // utils.js で使用するフォーマットに変換
            return {
                'Date (UTC)': transaction.date, // 完全な日付情報を渡す
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
            alert(window.utils.translate('No sequence diagram has been generated.'));
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
            alert(window.utils.translate('No sequence diagram has been generated.'));
            return;
        }

        // エンコードしたダイアグラムをURLに埋め込む
        const requestJson = { "code": generatedDiagram, "mermaid": "{\n  \"theme\": \"default\"\n}", "autoSync": true, "rough": false, "updateDiagram": true, "panZoom": false }
        const encoded = pako_deflate_base64(JSON.stringify(requestJson));
        console.log({ encoded });
        const url = `https://mermaid.live/view#pako:${encoded}`;
        window.open(url, '_blank');
    }

    // Mermaidコードをクリップボードにコピー
    function copyDiagramCode() {
        if (!generatedDiagram) {
            alert(window.utils.translate('No sequence diagram has been generated.'));
            return;
        }

        // クリップボードにコピー
        navigator.clipboard.writeText(generatedDiagram)
            .then(() => {
                // コピー成功時のフィードバック
                const originalText = copyDiagramCodeBtn.textContent;
                copyDiagramCodeBtn.textContent = window.utils.translate('Code copied to clipboard');

                // 2秒後に元のテキストに戻す
                setTimeout(() => {
                    copyDiagramCodeBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('クリップボードへのコピーに失敗しました:', err);
                alert('クリップボードへのコピーに失敗しました。');
            });
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

    // 言語切り替えボタンを追加する関数
    function addLanguageSwitcher() {
        // 既存のフッターを取得
        const footer = document.querySelector('footer');
        if (!footer) return;

        // 言語切り替えコンテナを作成
        const langSwitcher = document.createElement('div');
        langSwitcher.className = 'language-switcher';

        // 日本語ボタン
        const jaButton = document.createElement('button');
        jaButton.textContent = '日本語';
        jaButton.className = 'lang-button';
        jaButton.dataset.lang = 'ja';

        // 英語ボタン
        const enButton = document.createElement('button');
        enButton.textContent = 'English';
        enButton.className = 'lang-button';
        enButton.dataset.lang = 'en';

        // デフォルトは英語を選択状態に
        enButton.classList.add('active');

        // クリックイベントを設定
        jaButton.addEventListener('click', function () {
            window.utils.setLanguage('ja');
            updateLanguageButtonsState();
        });

        enButton.addEventListener('click', function () {
            window.utils.setLanguage('en');
            updateLanguageButtonsState();
        });

        // ボタンをコンテナに追加
        langSwitcher.appendChild(jaButton);
        langSwitcher.appendChild(enButton);

        // フッターの前に言語切り替えコンテナを挿入
        footer.insertAdjacentElement('beforebegin', langSwitcher);

        // スタイルを追加
        addLanguageSwitcherStyles();
    }

    // 言語ボタンの状態を更新する関数
    function updateLanguageButtonsState() {
        const buttons = document.querySelectorAll('.lang-button');
        const currentLang = window.utils.getCurrentLanguage();

        buttons.forEach(button => {
            if (button.dataset.lang === currentLang) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // 言語切り替えボタンのスタイルを追加する関数
    function addLanguageSwitcherStyles() {
        // スタイル要素がまだ存在しない場合のみ追加
        if (!document.getElementById('language-switcher-styles')) {
            const style = document.createElement('style');
            style.id = 'language-switcher-styles';
            style.textContent = `
                .language-switcher {
                    display: flex;
                    justify-content: center;
                    margin: 20px 0;
                    gap: 10px;
                }
                .lang-button {
                    padding: 5px 15px;
                    border: 1px solid var(--border-color);
                    background-color: var(--background-color);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .lang-button:hover {
                    background-color: var(--active-step-bg);
                }
                .lang-button.active {
                    background-color: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }
            `;
            document.head.appendChild(style);
        }
    }

    // イベントリスナーの設定
    generateDiagramBtn.addEventListener('click', generateSequenceDiagram);
    backToStep1Btn.addEventListener('click', () => goToStep(1));
    backToStep2Btn.addEventListener('click', () => goToStep(2));
    downloadDiagramBtn.addEventListener('click', downloadSVG);
    copyDiagramCodeBtn.addEventListener('click', copyDiagramCode);
    openMermaidLiveBtn.addEventListener('click', openInMermaidLive);
});