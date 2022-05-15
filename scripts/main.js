/**
 * StreamControl for MBAACC のメインモジュールです。
 * @module main
 */

/// <reference path="lib/jquery/jquery-3.6.0.min.js" />
/// <reference path="lib/jquery-ui/jquery-ui.min.js" />

/**
 * アプリケーションを表します。
 */
class App {
    /**
     * 構成設定の URL。
     */
    static #CONFIGURAIOTN_URL = 'scripts/appsettings.json';

    /**
     * StreamControl JSON データ。
     */
    data;

    /**
     * 構成設定。
     */
    #configuration;

    /**
     * メインビューモデル。
     */
    #mainViewModel;

    /**
     * アプリケーションの新しいインスタンスを初期化します。
     */
    constructor() {
        $.fn.extend(Extensions.jQuery);
    }

    /**
     * アプリケーションを実行します。
     */
    run() {
        $(async () => {
            this.#configuration = await this.getJSON(App.#CONFIGURAIOTN_URL);
            this.#mainViewModel = new MainViewModel(this.#configuration);

            await this.onInitialize();

            Task.interval(this.#configuration.updateInterval, () => {
                this.onUpdate(this);
            });
        });
    }

    /**
     * JSON データを取得します。
     * @param {string} url JSON の URL。
     * @returns {Object} JSON データ。
     */
    getJSON(url) {
        return $.getJSON(`${url}?v=${Date.now()}`);
    }

    /**
     * アプリケーションの初期化時の処理を実行します。
     * @param {App} sender アプリケーション。
     */
    async onInitialize() {
        const data = await this.getJSON(
            this.#configuration.streamControlDataUrl
        );

        await this.#mainViewModel.initialize(data);

        // StreamControl JSON データをバックアップします。
        this.data = data;
    }

    /**
     * アプリケーションの更新時の処理を実行します。
     * @param {App} sender アプリケーション。
     */
    async onUpdate(sender) {
        const data = await this.getJSON(
            sender.#configuration.streamControlDataUrl
        );

        // タイムスタンプに変更がない場合は処理しません。
        if (
            sender.data !== undefined &&
            sender.data.timestamp === data.timestamp
        ) {
            return;
        }

        await sender.#mainViewModel.update(data);

        // StreamControl JSON データをバックアップします。
        sender.data = data;
    }
}

/**
 * メイン画面のビューモデルです。
 */
class MainViewModel {
    /**
     * 構成設定。
     */
    #configuration;

    /**
     * メインビューモデルの新しいインスタンスを初期化します。
     * @param {Object} configuration
     */
    constructor(configuration) {
        this.#configuration = configuration;
    }

    /**
     * 画面を初期化します。
     * @param {Object} data
     */
    async initialize(data) {
        this.setDurations(data);

        // 起動時の表示アニメーションを実行します。
        $('#header')
            .show()
            .effect(
                'slide',
                { direction: 'up' },
                this.#configuration.duration.fade
            );
        await Task.delay(this.#configuration.duration.fade);

        // クロスフェードのアニメーションを登録します。
        $('#player1-name-main').crossFadeWithRotation(
            this.#configuration.duration,
            true
        );
        $('#player1-name-sub').crossFadeWithRotation(
            this.#configuration.duration,
            false
        );
        $('#player2-name-main').crossFadeWithRotation(
            this.#configuration.duration,
            true
        );
        $('#player2-name-sub').crossFadeWithRotation(
            this.#configuration.duration,
            false
        );

        await this.update(data);
    }

    /**
     * 画面を更新します。
     * @param {Object} data
     */
    async update(data) {
        this.setDurations(data);
        this.setTexts(data);
        await this.setMode(data);
    }

    /**
     * StreamControl JSON データの設定値で時間オプションを設定します。
     * @param {Object} data
     */
    setDurations(data) {
        if (!Utility.isEmpty(data.optionsDurationMainLanguage)) {
            this.#configuration.duration.mainLanguage = parseInt(
                data.optionsDurationMainLanguage
            );
        }

        if (!Utility.isEmpty(data.optionsDurationSubLanguage)) {
            this.#configuration.duration.subLanguage = parseInt(
                data.optionsDurationSubLanguage
            );
        }

        if (!Utility.isEmpty(data.optionsDurationFade)) {
            this.#configuration.duration.fade = parseInt(
                data.optionsDurationFade
            );
        }
    }

    /**
     * StreamControl JSON データでテキストを設定します。
     * @param {Object} data
     */
    setTexts(data) {
        // Event
        $('#event').textWithFade(
            data.matchEvent,
            this.#configuration.duration.fade
        );

        // Player 1
        $('#player1-name-main').textWithFade(
            data.matchPlayer1NameMain,
            this.#configuration.duration.fade
        );
        $('#player1-name-sub').textWithFade(
            data.matchPlayer1NameSub,
            this.#configuration.duration.fade,
            true
        );
        $('#player1-score').textWithFade(
            data.matchPlayer1Score,
            this.#configuration.duration.fade
        );

        // Player 2
        $('#player2-name-main').textWithFade(
            data.matchPlayer2NameMain,
            this.#configuration.duration.fade
        );
        $('#player2-name-sub').textWithFade(
            data.matchPlayer2NameSub,
            this.#configuration.duration.fade,
            true
        );
        $('#player2-score').textWithFade(
            data.matchPlayer2Score,
            this.#configuration.duration.fade
        );
    }

    async setMode(data) {
        if (
            app.data === undefined &&
            data.optionsModeScoreVisibility === CheckBoxValue.CHECKED
        ) {
            return;
        }

        if (app.data !== undefined) {
            if (
                app.data.optionsModeScoreVisibility ===
                data.optionsModeScoreVisibility
            ) {
                return;
            }

            app.data.optionsModeScoreVisibility =
                data.optionsModeScoreVisibility;
        }

        const halfDuration = parseInt(this.#configuration.duration.fade) / 2;

        $('#player-background').animate({ opacity: 0 }, halfDuration);
        $('#player-text').animate({ opacity: 0 }, halfDuration);
        await Task.delay(halfDuration);

        if (data.optionsModeScoreVisibility === CheckBoxValue.CHECKED) {
            // Background
            $('.player-background').show();
            $('.player-background-wide').hide();
            $('.score-background').show();

            // Player 1
            $('#player1-name-main').switchClass('name-text-wide', 'name-text');
            $('#player1-name-sub').switchClass('name-text-wide', 'name-text');
            $('#player1-score-outer').show();

            // Player 2
            $('#player2-name-main').switchClass('name-text-wide', 'name-text');
            $('#player2-name-sub').switchClass('name-text-wide', 'name-text');
            $('#player2-score-outer').show();
        } else {
            // Background
            $('.player-background').hide();
            $('.player-background-wide').show();
            $('.score-background').hide();

            // Player 1
            $('#player1-name-main').switchClass('name-text', 'name-text-wide');
            $('#player1-name-sub').switchClass('name-text', 'name-text-wide');
            $('#player1-score-outer').hide();

            // Player 2
            $('#player2-name-main').switchClass('name-text', 'name-text-wide');
            $('#player2-name-sub').switchClass('name-text', 'name-text-wide');
            $('#player2-score-outer').hide();
        }

        $('#player-background').animate({ opacity: 1 }, halfDuration);
        $('#player-text').animate({ opacity: 1 }, halfDuration);
        await Task.delay(halfDuration);
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

            if (Utility.isEmpty(duration)) {
                duration = 1000;
            }

            const halfDuration = parseInt(duration) / 2;

            if (Utility.isEmpty(isFadeOutOnly)) {
                isFadeOutOnly = false;
            }

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
         * @param {Object} durationOptions 時間オプション。
         * @param {boolean} isFirstFadeIn 初回がフェードインかどうか。
         */
        crossFadeWithRotation: function (durationOptions, isFirstFadeIn) {
            Task.run(async () => {
                while (true) {
                    this.crossFade(durationOptions, isFirstFadeIn);

                    const duration =
                        durationOptions.mainLanguage +
                        durationOptions.subLanguage +
                        durationOptions.fade * 2;
                    await Task.delay(duration);
                }
            });
        },

        /**
         * クロスフェードします。
         * @param {Object} durationOptions 時間オプション。
         * @property {boolean} isFirstIn 初回がフェードインかどうか。
         */
        crossFade: async function (durationOptions, isFirstFadeIn) {
            const first = isFirstFadeIn ? 1 : 0;
            const second = isFirstFadeIn ? 0 : 1;

            this.animate({ opacity: first }, durationOptions.fade);
            await Task.delay(
                durationOptions.fade + durationOptions.mainLanguage
            );
            this.animate({ opacity: second }, durationOptions.fade);
            await Task.delay(
                durationOptions.fade + durationOptions.subLanguage
            );
        },

        /**
         * クラスを切り替えます。
         * @param {string} remove 削除するクラス。
         * @param {string} add 追加するクラス。
         */
        switchClass: function (remove, add) {
            this.removeClass(remove);
            this.addClass(add);
        },
    };
}

/**
 * ユーティリティ関数を定義します。
 */
class Utility {
    /**
     * 値が空かどうか確認します。
     * @param {Object} value
     * @returns {boolean} 値が空の場合は true、そうでなければ false。
     */
    static isEmpty(value) {
        return !value;
    }
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

/**
 * チェックボックスの値。
 * @enum {string}
 */
const CheckBoxValue = {
    UNCHECKED: '0',
    CHECKED: '1',
};

const app = new App();
app.run();
