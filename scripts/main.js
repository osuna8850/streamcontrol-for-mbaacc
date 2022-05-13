import configuration from './appsettings.json' assert { type: 'json' };
import './lib/jquery/jquery-3.6.0.min.js';
import './lib/jquery-ui/jquery-ui.min.js';

/**
 * アプリケーションを表します。
 */
class App {
    /**
     * メインビューモデル。
     */
    #mainViewModel;

    /**
     * StreamControl JSON データ。
     */
    #data;

    /**
     * アプリケーションの新しいインスタンスを初期化します。
     */
    constructor() {
        this.#mainViewModel = new MainViewModel();
    }

    /**
     * アプリケーションを実行します。
     */
    run() {
        $(() => {
            $.fn.extend(Extensions.jQuery);

            this.#onInitialize();

            Task.interval(configuration.updateInterval, () => {
                this.#onUpdate(this);
            });
        });
    }

    /**
     * StreamControl JSON データを取得します。
     * @returns {Object} StreamControl JSON データ。
     */
    #getStreamControlData() {
        const url = `${configuration.streamControlDataUrl}?v=${Date.now()}`;
        return $.getJSON(url);
    }

    /**
     * アプリケーションの初期化時の処理を実行します。
     * @param {App} sender アプリケーション。
     */
    async #onInitialize() {
        const data = await this.#getStreamControlData();

        this.#mainViewModel.initialize(data);

        // StreamControl JSON データをバックアップします。
        this.#data = data;
    }

    /**
     * アプリケーションの更新時の処理を実行します。
     * @param {App} sender アプリケーション。
     */
    async #onUpdate(sender) {
        const data = await this.#getStreamControlData();

        // タイムスタンプに変更がない場合は処理しません。
        if (sender.#data?.timestamp === data.timestamp) {
            return;
        }

        sender.#mainViewModel.update(data);

        // StreamControl JSON データをバックアップします。
        sender.#data = data;
    }
}

/**
 * メイン画面のビューモデルです。
 */
class MainViewModel {
    /**
     * 時間オプション。
     */
    #durations = configuration.durations;

    /**
     * 画面を初期化します。
     * @param {Object} data
     */
    async initialize(data) {
        // 起動時の表示アニメーションを実行します。
        await $('#header')
            .effect('slide', { direction: 'up' }, this.#durations.fade)
            .promise();

        this.#setDurations(data);

        // クロスフェードのアニメーションを登録します。
        $('#player1-name-main').crossFadeWithRotation(this.#durations, true);
        $('#player1-name-sub').crossFadeWithRotation(this.#durations, false);
        $('#player2-name-main').crossFadeWithRotation(this.#durations, true);
        $('#player2-name-sub').crossFadeWithRotation(this.#durations, false);

        this.update(data);
    }

    /**
     * 画面を更新します。
     * @param {Object} data
     */
    update(data) {
        this.#setDurations(data);

        // Event
        $('#event').textWithFade(data.matchEvent, this.#durations.fade);

        // Player 1
        $('#player1-name-main').textWithFade(
            data.matchPlayer1NameMain,
            this.#durations.fade
        );
        $('#player1-name-sub').textWithFade(
            data.matchPlayer1NameSub,
            this.#durations.fade,
            true
        );
        $('#player1-score').textWithFade(
            data.matchPlayer1Score,
            this.#durations.fade
        );

        // Player 2
        $('#player2-name-main').textWithFade(
            data.matchPlayer2NameMain,
            this.#durations.fade
        );
        $('#player2-name-sub').textWithFade(
            data.matchPlayer2NameSub,
            this.#durations.fade,
            true
        );
        $('#player2-score').textWithFade(
            data.matchPlayer2Score,
            this.#durations.fade
        );
    }

    /**
     * StreamControl JSON データの設定値で時間オプションを設定します。
     * @param {Object} data
     */
    #setDurations(data) {
        const mainLanguage =
            parseInt(data.optionsDurationMainLanguage) ??
            configuration.durations.mainLanguage;
        const subLanguage =
            parseInt(data.optionsDurationSubLanguage) ??
            configuration.durations.subLanguage;
        const fade =
            parseInt(data.optionsDurationFade) ?? configuration.durations.fade;

        this.#durations.mainLanguage = mainLanguage;
        this.#durations.subLanguage = subLanguage;
        this.#durations.fade = fade;
    }
}

/**
 * 拡張メソッドを定義します。
 */
class Extensions {
    /**
     * jQuery の拡張メソッドオブジェクト。
     */
    static jQuery = {
        /**
         * テキストを設定し、フェードのアニメーションを行います。
         * @param {string} text テキスト。
         * @param {number} duration フェード時間。
         * @param {boolean} isFadeOutOnly フェードアウトのみかどうか。
         */
        textWithFade: async function (text, duration, isFadeOutOnly) {
            // テキストが同一の場合、何もしません。
            if (this.text() === text) {
                return;
            }

            // テキストが非表示の場合、テキストだけを設定して終了します。
            if (this.css('opacity') === '0') {
                this.text(text);
                return;
            }

            duration ??= 1000;
            const halfDuration = parseInt(duration) / 2;

            isFadeOutOnly ??= false;

            // キューのアニメーションを停止します。
            this.stop(true, true);

            // フェードアウトします。
            await this.animate({ opacity: 0 }, halfDuration).promise();

            // テキストを変更します。
            this.text(text);

            // フェードアウトのみではない場合、フェードインします。
            if (!isFadeOutOnly) {
                await this.animate({ opacity: 1 }, halfDuration).promise();
            }
        },

        /**
         * クロスフェードでローテーションします。
         * @param {Object} durations 時間オプション。
         * @param {boolean} isFirstFadeIn 初回がフェードインかどうか。
         */
        crossFadeWithRotation: function (durations, isFirstFadeIn) {
            Task.run(async () => {
                while (true) {
                    this.crossFade(durations, isFirstFadeIn);

                    const duration =
                        durations.mainLanguage +
                        durations.subLanguage +
                        durations.fade * 2;
                    await Task.delay(duration);
                }
            });
        },

        /**
         * クロスフェードします。
         * @param {Object} durations 時間オプション。
         * @property {boolean} isFirstIn 初回がフェードインかどうか。
         */
        crossFade: async function (durations, isFirstFadeIn) {
            const first = isFirstFadeIn ? 1 : 0;
            const second = isFirstFadeIn ? 0 : 1;

            this.animate({ opacity: first }, durations?.fade);
            await Task.delay(durations?.fade + durations?.mainLanguage);
            this.animate({ opacity: second }, durations?.fade);
            await Task.delay(durations?.fade + durations?.subLanguage);
        },
    };
}

/**
 * タスクを表します。
 */
class Task {
    /**
     * 新しいタスクで関数を実行します。
     * @param {Function} action 関数。
     */
    static run(action) {
        return new Promise(resolve => {
            action();
            resolve();
        });
    }

    /**
     * 指定の時間だけスリーブします。
     * @param {number} milliseconds ミリ秒。
     */
    static delay(milliseconds) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, milliseconds);
        });
    }

    /**
     * 指定の時間の間隔で関数を実行します。
     * @param {number} milliseconds ミリ秒。
     * @param {Function} action 関数。
     */
    static interval(milliseconds, action, abortSignal) {
        return new Promise((resolve, reject) => {
            setInterval(() => {
                action();
                resolve();
            }, milliseconds);
        });
    }
}

const app = new App();
app.run();
