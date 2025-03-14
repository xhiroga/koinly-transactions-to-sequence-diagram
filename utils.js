/**
 * CSVがKoinlyのトランザクションデータかどうかを判定する関数
 */
function isKoinlyCSV(headers) {
    // Koinlyのトランザクションデータに特有の必須ヘッダー
    const requiredHeaders = [
        'Date (UTC)',
        'Type',
        'From Amount',
        'From Currency',
        'To Amount',
        'To Currency'
    ];

    // オプションのヘッダー（存在すればさらに確度が上がる）
    const optionalHeaders = [
        'Fee Amount',
        'Fee Currency',
        'Net Worth Amount',
        'Net Worth Currency',
        'Description'
    ];

    // 必須ヘッダーがすべて存在するか確認
    const hasAllRequired = requiredHeaders.every(header =>
        headers.includes(header)
    );

    // オプションのヘッダーが一部存在するか確認
    const optionalHeaderCount = optionalHeaders.filter(header =>
        headers.includes(header)
    ).length;

    // 必須ヘッダーがすべて存在し、オプションのヘッダーが少なくとも1つ存在する場合はKoinlyのCSVと判定
    return hasAllRequired && optionalHeaderCount > 0;
}

/**
 * ウォレット情報から取引所名を抽出する関数
 */
function getExchange(wallet) {
    if (!wallet || wallet.trim() === '') {
        return 'UnknownWallet';
    }
    // セミコロンで分割して最初の部分を取得
    return wallet.split(';')[0].trim();
}

/**
 * 通貨フィールドから通貨コードを抽出する関数
 */
function getCurrency(currencyField) {
    return currencyField.split(';')[0].trim();
}

/**
 * 金額をフォーマットする関数
 */
function formatAmount(amount) {
    try {
        const val = parseFloat(amount);
        if (isNaN(val)) return amount;

        // 桁区切りでフォーマット（小数点以下8桁まで）
        let formatted = val.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 8
        });

        // 小数点以下の不要な0を除去
        if (formatted.includes('.')) {
            formatted = formatted.replace(/\.?0+$/, '');
        }

        return formatted;
    } catch (e) {
        return amount;
    }
}

/**
 * 1行分のデータからシーケンス図の1行（文字列）を生成する関数
 */
function processRow(row) {
    const fromWallet = row["From Wallet (read-only)"];
    const toWallet = row["To Wallet (read-only)"];
    const fromCurrencyField = row["From Currency"];
    const toCurrencyField = row["To Currency"];
    const sumFrom = row["Sum of From Amount"];
    const sumTo = row["Sum of To Amount"];

    // 通貨コードの抽出
    const fromCurrency = fromCurrencyField ? getCurrency(fromCurrencyField) : "";
    const toCurrency = toCurrencyField ? getCurrency(toCurrencyField) : "";

    // ウォレット情報から取引所名の取得（空欄なら「UnknownWallet」）
    const fromExchange = getExchange(fromWallet);
    const toExchange = getExchange(toWallet);

    // 両ウォレットに情報がある場合：変換（conversion）
    if (fromWallet && fromWallet.trim() !== "" && toWallet && toWallet.trim() !== "") {
        return `${fromExchange} (${fromCurrency})->>${toExchange} (${toCurrency}): ${formatAmount(sumFrom)}${fromCurrency} -> ${formatAmount(sumTo)}${toCurrency}`;
    }
    // To Walletが空欄の場合：出金（Withdraw）とみなし、To側はUnknownWallet
    else if (fromWallet && fromWallet.trim() !== "" && (!toWallet || toWallet.trim() === "")) {
        return `${fromExchange} (${fromCurrency})->>${"UnknownWallet"} (${fromCurrency}): ${formatAmount(sumFrom)}${fromCurrency}をWithdraw`;
    }
    // From Walletが空欄の場合：入金（Deposit）とみなし、From側はUnknownWallet
    else if ((!fromWallet || fromWallet.trim() === "") && toWallet && toWallet.trim() !== "") {
        return `${"UnknownWallet"} (${toCurrency})->>${toExchange} (${toCurrency}): ${formatAmount(sumTo)}${toCurrency}をDeposit`;
    }
    // 両方空欄の場合（想定外）
    else {
        return `${"UnknownWallet"} (${toCurrency})->>${"UnknownWallet"} (${toCurrency}): ${formatAmount(sumTo)}${toCurrency}をDeposit`;
    }
}

/**
 * 行からparticipantを抽出する関数
 */
function extractParticipants(row) {
    const fromWallet = row["From Wallet (read-only)"];
    const toWallet = row["To Wallet (read-only)"];
    const fromCurrencyField = row["From Currency"];
    const toCurrencyField = row["To Currency"];

    // 通貨コードの抽出
    const fromCurrency = fromCurrencyField ? getCurrency(fromCurrencyField) : "";
    const toCurrency = toCurrencyField ? getCurrency(toCurrencyField) : "";

    // ウォレット情報から取引所名の取得（空欄なら「UnknownWallet」）
    const fromExchange = getExchange(fromWallet);
    const toExchange = getExchange(toWallet);

    // participantの生成
    const participants = [];

    // From側の処理
    if (fromCurrency) {
        participants.push(`${fromExchange} (${fromCurrency})`);

        // 出金操作の場合は「UnknownWallet」も参加者として追加
        if (!toWallet || toWallet.trim() === "") {
            participants.push(`UnknownWallet (${fromCurrency})`);
        }
    }

    // To側の処理
    if (toCurrency) {
        participants.push(`${toExchange} (${toCurrency})`);

        // 入金操作の場合は「UnknownWallet」も参加者として追加
        if (!fromWallet || fromWallet.trim() === "") {
            participants.push(`UnknownWallet (${toCurrency})`);
        }
    }

    return participants;
}

/**
 * 取引の方向を無視した通貨ペアと取引所ペアのキーを生成する関数
 */
function getTransactionKey(row) {
    // 通貨コードの抽出
    const fromCurrency = row["From Currency"] ? getCurrency(row["From Currency"]) : "";
    const toCurrency = row["To Currency"] ? getCurrency(row["To Currency"]) : "";

    // ウォレット情報から取引所名の取得
    const fromExchange = getExchange(row["From Wallet (read-only)"]);
    const toExchange = getExchange(row["To Wallet (read-only)"]);

    // 通貨と取引所をアルファベット順にソートして一貫性のあるキーを生成
    const currencies = [fromCurrency, toCurrency].sort();
    const exchanges = [fromExchange, toExchange].sort();

    return `${currencies[0]}-${currencies[1]}:${exchanges[0]}-${exchanges[1]}`;
}

/**
 * 2つの取引が逆方向かどうかを判定する関数
 */
function isReverseTransaction(row1, row2) {
    // 通貨の方向が逆であることを確認
    return (
        row1["From Currency"] === row2["To Currency"] &&
        row1["To Currency"] === row2["From Currency"] &&
        row1["From Wallet (read-only)"] === row2["To Wallet (read-only)"] &&
        row1["To Wallet (read-only)"] === row2["From Wallet (read-only)"]
    );
}

/**
 * 指定した期間内の同じ通貨ペア・取引所間の取引を集約する関数
 *
 * @param {Array} transactions 取引データの配列
 * @param {string} period 集約する期間（'day', 'month', 'year'のいずれか）
 * @returns {Array} 集約された取引データの配列
 */
function aggregateTransactions(transactions, period = 'year') {
    // 日付文字列から期間キーを生成する関数
    function getPeriodKey(dateStr, periodType) {
        const date = new Date(dateStr);

        switch (periodType) {
            case 'day':
                // 日単位: YYYY-MM-DD
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            case 'month':
                // 月単位: YYYY-MM
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            case 'year':
            default:
                // 年単位: YYYY
                return date.getFullYear().toString();
        }
    }

    // 期間ごとにグループ化
    const periodGroups = {};
    transactions.forEach(row => {
        // 日付情報の取得
        let dateStr;
        if (row["Date (UTC)"]) {
            // 実際の日付がある場合はそれを使用
            dateStr = row["Date (UTC)"];
        } else if (row["Years (Date (UTC))"]) {
            // 年のみの情報がある場合は、その年の1月1日を使用
            const year = parseInt(row["Years (Date (UTC))"]);
            dateStr = `${year}-01-01`;
        } else {
            // どちらもない場合は現在の日付を使用
            dateStr = new Date().toISOString().split('T')[0];
        }

        const periodKey = getPeriodKey(dateStr, period);

        if (!periodGroups[periodKey]) {
            periodGroups[periodKey] = [];
        }
        periodGroups[periodKey].push({ ...row });
    });

    const resultRows = [];

    // 各期間内で同じ通貨ペア・取引所間の取引を集約
    Object.keys(periodGroups).forEach(periodKey => {
        const periodGroup = periodGroups[periodKey];
        const transactionGroups = {};

        // 各取引をキーでグループ化
        periodGroup.forEach(row => {
            // キーの生成: from通貨+取引所_to通貨+取引所
            const fromKey = `${row["From Currency"]}_${row["From Wallet (read-only)"]}`;
            const toKey = `${row["To Currency"]}_${row["To Wallet (read-only)"]}`;
            const directionKey = `${fromKey}__${toKey}`;

            if (!transactionGroups[directionKey]) {
                transactionGroups[directionKey] = [];
            }
            transactionGroups[directionKey].push(row);
        });

        // 各グループの取引を集約
        Object.keys(transactionGroups).forEach(key => {
            const group = transactionGroups[key];

            if (group.length === 1) {
                // 単一の取引はそのまま追加
                resultRows.push(group[0]);
            } else {
                // 複数の取引は集約
                const baseRow = { ...group[0] };

                // 金額を合計
                let totalFromAmount = 0;
                let totalToAmount = 0;

                group.forEach(row => {
                    totalFromAmount += parseFloat(row["Sum of From Amount"]) || 0;
                    totalToAmount += parseFloat(row["Sum of To Amount"]) || 0;
                });

                baseRow["Sum of From Amount"] = totalFromAmount;
                baseRow["Sum of To Amount"] = totalToAmount;

                resultRows.push(baseRow);
            }
        });
    });

    return resultRows;
}

/**
 * 年内で逆取引を検出し、相殺して差分を計算する関数
 */
function offsetTransactions(transactions) {
    const resultRows = [];

    // 年ごとにグループ化
    const yearGroups = {};
    transactions.forEach(row => {
        const year = row["Years (Date (UTC))"];
        if (!yearGroups[year]) {
            yearGroups[year] = [];
        }
        yearGroups[year].push({ ...row }); // 浅いコピーを作成
    });

    // 各年ごとに処理
    Object.keys(yearGroups).forEach(year => {
        const yearGroup = yearGroups[year];
        const processedIndices = new Set();

        // 通貨ペアと取引所ペアでグループ化するためのキーを作成
        yearGroup.forEach(row => {
            row.transaction_key = getTransactionKey(row);
        });

        // キーでグループ化
        const keyGroups = {};
        yearGroup.forEach((row, index) => {
            const key = row.transaction_key;
            if (!keyGroups[key]) {
                keyGroups[key] = [];
            }
            keyGroups[key].push({ row, index });
        });

        // 各グループ内で処理
        Object.keys(keyGroups).forEach(key => {
            const keyGroup = keyGroups[key];

            if (keyGroup.length <= 1) {
                // グループ内に1行しかない場合はそのまま追加
                if (!processedIndices.has(keyGroup[0].index)) {
                    resultRows.push(keyGroup[0].row);
                    processedIndices.add(keyGroup[0].index);
                }
                return;
            }

            // グループ内の各行を処理
            for (let i = 0; i < keyGroup.length; i++) {
                const { row: row1, index: idx1 } = keyGroup[i];

                if (processedIndices.has(idx1)) {
                    continue;
                }

                // 逆取引を検索
                let foundReverse = false;

                for (let j = i + 1; j < keyGroup.length; j++) {
                    const { row: row2, index: idx2 } = keyGroup[j];

                    if (processedIndices.has(idx2)) {
                        continue;
                    }

                    if (isReverseTransaction(row1, row2)) {
                        // 逆取引が見つかった場合、差分を計算
                        const fromCurrency1 = getCurrency(row1["From Currency"]);
                        const toCurrency1 = getCurrency(row1["To Currency"]);
                        const fromAmount1 = parseFloat(row1["Sum of From Amount"]);
                        const toAmount1 = parseFloat(row1["Sum of To Amount"]);

                        const fromCurrency2 = getCurrency(row2["From Currency"]);
                        const toCurrency2 = getCurrency(row2["To Currency"]);
                        const fromAmount2 = parseFloat(row2["Sum of From Amount"]);
                        const toAmount2 = parseFloat(row2["Sum of To Amount"]);

                        // どちらの方向で差分を表示するかを決定（金額の大きい方を基準）
                        let newRow, diffFromAmount, diffToAmount;

                        if (fromAmount2 > toAmount1) {
                            // row2の方向（from_currency2 -> to_currency2）で表示
                            diffFromAmount = fromAmount2 - toAmount1;
                            diffToAmount = toAmount2 - fromAmount1;

                            newRow = { ...row2 };
                        } else {
                            // row1の方向（from_currency1 -> to_currency1）で表示
                            diffFromAmount = fromAmount1 - toAmount2;
                            diffToAmount = toAmount1 - fromAmount2;

                            newRow = { ...row1 };
                        }

                        // 差分をセット
                        newRow["Sum of From Amount"] = diffFromAmount;
                        newRow["Sum of To Amount"] = diffToAmount;

                        // 差分が0より大きい場合のみ追加
                        if (diffFromAmount > 0 && diffToAmount > 0) {
                            resultRows.push(newRow);
                        }

                        // 処理済みとしてマーク
                        processedIndices.add(idx1);
                        processedIndices.add(idx2);
                        foundReverse = true;
                        break;
                    }
                }

                // 逆取引が見つからなかった場合はそのまま追加
                if (!foundReverse) {
                    resultRows.push(row1);
                    processedIndices.add(idx1);
                }
            }
        });
    });

    // 結果を返す
    return resultRows.length > 0 ? resultRows : [...transactions];
}

/**
 * 年ごとに各通貨・取引所の変動量と通貨ごとの合計変動量を計算する関数
 */
function calculateYearlyBalanceChanges(transactions) {
    const yearlyChanges = {};
    const yearlyCurrencyTotals = {};

    // 年ごとにグループ化
    transactions.forEach(row => {
        const year = row["Years (Date (UTC))"];
        if (!yearlyChanges[year]) {
            yearlyChanges[year] = {};
            yearlyCurrencyTotals[year] = {};
        }

        const fromWallet = row["From Wallet (read-only)"];
        const toWallet = row["To Wallet (read-only)"];
        const fromCurrencyField = row["From Currency"];
        const toCurrencyField = row["To Currency"];
        const fromAmount = parseFloat(row["Sum of From Amount"]) || 0;
        const toAmount = parseFloat(row["Sum of To Amount"]) || 0;

        // 通貨コードの抽出
        const fromCurrency = fromCurrencyField ? getCurrency(fromCurrencyField) : "";
        const toCurrency = toCurrencyField ? getCurrency(toCurrencyField) : "";

        // ウォレット情報から取引所名の取得
        const fromExchange = getExchange(fromWallet);
        const toExchange = getExchange(toWallet);

        // From側の変動（マイナス）
        if (fromCurrency && fromExchange !== "UnknownWallet") {
            // 通貨・取引所ごとの変動量
            const fromKey = `${fromExchange} (${fromCurrency})`;
            if (yearlyChanges[year][fromKey] === undefined) {
                yearlyChanges[year][fromKey] = 0;
            }
            yearlyChanges[year][fromKey] -= fromAmount;

            // 通貨ごとの合計変動量
            if (yearlyCurrencyTotals[year][fromCurrency] === undefined) {
                yearlyCurrencyTotals[year][fromCurrency] = 0;
            }
            yearlyCurrencyTotals[year][fromCurrency] -= fromAmount;
        }

        // To側の変動（プラス）
        if (toCurrency && toExchange !== "UnknownWallet") {
            // 通貨・取引所ごとの変動量
            const toKey = `${toExchange} (${toCurrency})`;
            if (yearlyChanges[year][toKey] === undefined) {
                yearlyChanges[year][toKey] = 0;
            }
            yearlyChanges[year][toKey] += toAmount;

            // 通貨ごとの合計変動量
            if (yearlyCurrencyTotals[year][toCurrency] === undefined) {
                yearlyCurrencyTotals[year][toCurrency] = 0;
            }
            yearlyCurrencyTotals[year][toCurrency] += toAmount;
        }
    });

    return [yearlyChanges, yearlyCurrencyTotals];
}

/**
 * 年ごとの各通貨・取引所の変動量をnote形式でフォーマットする関数
 */
function formatYearlyBalanceNote(firstParticipant, changes) {
    // 変動量が0でないものだけをフィルタリング
    const filteredChanges = {};
    Object.keys(changes).forEach(key => {
        if (Math.abs(changes[key]) > 0.000001) {
            filteredChanges[key] = changes[key];
        }
    });

    if (Object.keys(filteredChanges).length === 0) {
        return null;
    }

    // 変動量の大きい順にソート
    const sortedChanges = Object.entries(filteredChanges)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    // 変動量を文字列に変換
    const changeStrs = sortedChanges.map(([participant, amount]) => {
        // 小数点以下の不要な0を除去
        const formattedAmount = formatAmount(amount);
        const currency = participant.match(/\(([^)]+)\)/)[1]; // "Binance (BTC)" から "BTC" を抽出

        // プラス記号を追加
        if (amount > 0) {
            return `${participant} +${formattedAmount}${currency}`;
        } else {
            return `${participant} ${formattedAmount}${currency}`;
        }
    });

    // note形式の文字列を生成
    return `    Note right of ${firstParticipant}: ${changeStrs.join(', ')}`;
}

/**
 * 取引データを期間ごとにグループ化する関数
 *
 * @param {Array} transactions 取引データの配列
 * @param {string} periodType 期間タイプ（'none', 'day', 'month', 'year'のいずれか）
 * @returns {Object} 期間ごとにグループ化されたデータ
 */
function groupTransactionsByPeriod(transactions, periodType = 'year') {
    const periodGroups = {};

    transactions.forEach(row => {
        // 日付情報の取得
        let dateStr;
        if (row["Date (UTC)"]) {
            // 実際の日付がある場合はそれを使用
            dateStr = row["Date (UTC)"];
        } else if (row["Years (Date (UTC))"]) {
            // 年のみの情報がある場合は、その年の1月1日を使用
            const year = parseInt(row["Years (Date (UTC))"]);
            dateStr = `${year}-01-01`;
        } else {
            // どちらもない場合は現在の日付を使用
            dateStr = new Date().toISOString().split('T')[0];
        }

        // 期間キーを生成
        let periodKey;
        const date = new Date(dateStr);

        switch (periodType) {
            case 'day':
                // 日単位: YYYY-MM-DD
                periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                break;
            case 'month':
                // 月単位: YYYY-MM
                periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                break;
            case 'year':
                // 年単位: YYYY
                periodKey = date.getFullYear().toString();
                break;
            default:
                // まとめない場合は日付をそのまま使用
                periodKey = dateStr;
                break;
        }

        if (!periodGroups[periodKey]) {
            periodGroups[periodKey] = [];
        }
        periodGroups[periodKey].push(row);
    });

    return periodGroups;
}

/**
 * シーケンス図を生成する関数
 *
 * @param {Array} transactions 取引データの配列
 * @param {Object} options オプション設定
 * @param {boolean} options.offset 逆取引を相殺するか（デフォルト: true）
 * @param {string} options.aggregatePeriod 取引をまとめる期間（'none', 'day', 'month', 'year'のいずれか、デフォルト: 'year'）
 * @returns {string} Mermaid形式のシーケンス図
 */
function generateSequenceDiagram(transactions, options = {}) {
    // デフォルトオプション
    const defaultOptions = {
        offset: true,             // 逆取引を相殺する
        aggregatePeriod: 'year',  // 取引をまとめる期間
    };

    // オプションをマージ
    const mergedOptions = { ...defaultOptions, ...options };

    // 後方互換性のため、booleanが渡された場合はoffsetオプションとして扱う
    if (arguments.length > 1 && typeof arguments[1] === 'boolean') {
        mergedOptions.offset = arguments[1];
    }

    // 前処理
    let processedTransactions = [...transactions];

    // 取引の集約（期間が'none'でない場合）
    if (mergedOptions.aggregatePeriod !== 'none') {
        processedTransactions = aggregateTransactions(processedTransactions, mergedOptions.aggregatePeriod);
    }

    // 逆取引の相殺（オプションが有効な場合）
    if (mergedOptions.offset) {
        processedTransactions = offsetTransactions(processedTransactions);
    }

    // 全てのparticipantを収集
    const allParticipants = new Set();
    processedTransactions.forEach(row => {
        extractParticipants(row).forEach(participant => {
            allParticipants.add(participant);
        });
    });

    // participantをアルファベット順でソート
    const sortedParticipants = Array.from(allParticipants).sort();

    // シーケンス図の生成
    const diagramLines = ["sequenceDiagram", "    autonumber"];

    // participantの宣言を追加
    sortedParticipants.forEach(participant => {
        diagramLines.push(`    participant ${participant}`);
    });
    // 期間ごとにグループ化
    const periodGroups = groupTransactionsByPeriod(processedTransactions, mergedOptions.aggregatePeriod);

    // 期間順にソート
    const sortedPeriods = Object.keys(periodGroups).sort();

    // 各期間のトランザクションを処理
    sortedPeriods.forEach(period => {
        // 期間に応じたラベルを表示
        diagramLines.push(`    Note right of ${sortedParticipants[0]}: ${period}`);

        periodGroups[period].forEach(row => {
            const line = processRow(row);
            diagramLines.push(`    ${line}`);
        });
    });

    return diagramLines.join("\n");
}

// ブラウザとNode.js環境両方で動作するようにする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isKoinlyCSV,
        getExchange,
        getCurrency,
        formatAmount,
        processRow,
        extractParticipants,
        getTransactionKey,
        isReverseTransaction,
        offsetTransactions,
        calculateYearlyBalanceChanges,
        formatYearlyBalanceNote,
        groupTransactionsByPeriod,
        generateSequenceDiagram
    };
} else if (typeof window !== 'undefined') {
    window.utils = window.utils || {};
    window.utils.isKoinlyCSV = isKoinlyCSV;
    window.utils.getExchange = getExchange;
    window.utils.getCurrency = getCurrency;
    window.utils.formatAmount = formatAmount;
    window.utils.processRow = processRow;
    window.utils.extractParticipants = extractParticipants;
    window.utils.getTransactionKey = getTransactionKey;
    window.utils.isReverseTransaction = isReverseTransaction;
    window.utils.offsetTransactions = offsetTransactions;
    window.utils.calculateYearlyBalanceChanges = calculateYearlyBalanceChanges;
    window.utils.formatYearlyBalanceNote = formatYearlyBalanceNote;
    window.utils.groupTransactionsByPeriod = groupTransactionsByPeriod;
    window.utils.generateSequenceDiagram = generateSequenceDiagram;
}