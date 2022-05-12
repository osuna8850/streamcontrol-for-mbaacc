import configuration from './appsettings.json' assert { type: 'json' };
import './lib/jquery/jquery-3.6.0.min.js';
import './lib/jquery-ui/jquery-ui.min.js';

/**
 * アプリケーションを表します。
 */
class App {
    /**
     * 中止コントローラー。
     * @member {AbortController}
     */
    abortController;

    /**
     * メインビューモデル。
     * @member {MainViewModel}
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
        this.abortController = new AbortController();
    }

    /**
     * アプリケーションを実行します。
     */
    run() {
        $(async () => {
            $.fn.extend(Extensions.jQuery);

            this.#mainViewModel.initialize();

            await Task.interval(configuration.updateInterval, () => {
                this.#onUpdate(this);
            });
        });
    }

    /**
     * アプリケーションの更新時の処理を実行します。
     * @param {App} self アプリケーション。
     */
    async #onUpdate(self) {
        const url = `${configuration.streamControlDataUrl}?v=${Date.now()}`;
        const data = await $.getJSON(url);

        // タイムスタンプに変更がない場合は処理しません。
        if (self.#data?.timestamp === data.timestamp) {
            return;
        }

        self.#mainViewModel.update(data);

        // StreamControl JSON データをバックアップします。
        self.#data = data;
    }
}

/**
 * メイン画面のビューモデルです。
 */
class MainViewModel {
    /**
     * 画面を初期化します。
     */
    async initialize() {
        // 起動時の表示アニメーションを設定します。
        $('#header').effect(
            'slide',
            { direction: 'up' },
            configuration.durations.fade
        );

        // アニメーションが終了するまで待ちます。
        await Task.delay(configuration.durations.fade);
    }

    /**
     * 画面を更新します。
     * @param {Object} data
     */
    update(data) {
        app.abortController.abort();
        app.abortController = new AbortController();

        // Event
        $('#event').textWithFade(data.matchEvent, data.optionsDurationFade);

        // Player 1
        $('#player1-name').textWithRotation(
            data.matchPlayer1NameMain,
            data.optionsDurationMainLanguage,
            data.matchPlayer1NameSub,
            data.optionsDurationSubLanguage,
            data.optionsDurationFade,
            app.abortController.signal
        );
        $('#player1-score').textWithFade(
            data.matchPlayer1Score,
            data.optionsDurationFade
        );

        // Player 2
        $('#player2-name').textWithRotation(
            data.matchPlayer2NameMain,
            data.optionsDurationMainLanguage,
            data.matchPlayer2NameSub,
            data.optionsDurationSubLanguage,
            data.optionsDurationFade,
            app.abortController.signal
        );
        $('#player2-score').textWithFade(
            data.matchPlayer2Score,
            data.optionsDurationFade
        );
    }
}

class Extensions {
    static jQuery = {
        /**
         * テキストを設定し、クロスフェードのアニメーションを行います。
         * @param {string} text テキスト。
         * @param {number} duration フェード時間。
         * @param {AbortSignal} abortSignal 中止シグナル。
         */
        textWithFade: async function (text, duration, abortSignal) {
            // テキストが同一の場合は何もしません。
            if (this.text() === text) {
                return;
            }

            duration ??= configuration.durations.fade;

            // フェードアウトします。
            this.fadeOut(duration);
            try {
                await Task.delay(duration, abortSignal);
            } catch (e) {
                if (e.name === 'AbortError') {
                    // 処理を終了します。
                    return;
                } else {
                    // エラーを再スローします。
                    throw e;
                }
            }

            // テキストを変更します。
            this.text(text);

            // フェードインします。
            this.fadeIn(duration);
        },

        /**
         * テキストを設定し、クロスフェードでローテーションします。
         * @param {string} mainText テキスト。
         * @param {number} mainDuration テキストの表示時間。
         * @param {string} subText サブテキスト。
         * @param {number} subDuration サブテキストの表示時間。
         * @param {number} fadeDuration フェード時間。
         * @param {AbortSignal} abortSignal 中止シグナル。
         */
        textWithRotation: async function (
            mainText,
            mainDuration,
            subText,
            subDuration,
            fadeDuration,
            abortSignal
        ) {
            subText ??= mainText;
            mainDuration ??= configuration.durations.mainLanguage;
            subDuration ??= configuration.durations.subLanguage;
            fadeDuration ??= configuration.durations.fade;

            try {
                this.textWithFade(mainText, fadeDuration, abortSignal);
                await Task.delay(mainDuration, abortSignal);

                this.textWithFade(subText, fadeDuration, abortSignal);
                await Task.delay(subDuration, abortSignal);

                this.textWithRotation(
                    mainText,
                    mainDuration,
                    subText,
                    subDuration,
                    fadeDuration,
                    abortSignal
                );
            } catch (e) {
                if (e.name === 'AbortError') {
                    // 処理を終了します。
                    return;
                } else {
                    // エラーを再スローします。
                    throw e;
                }
            }
        },
    };
}

/**
 * タスクを表します。
 */
class Task {
    /**
     * 指定の時間だけスリーブします。
     * @param {number} milliseconds ミリ秒。
     * @param {AbortSignal} abortSignal 中止シグナル。
     * @throws {DOMException} 中止エラー。
     */
    static delay(milliseconds, abortSignal) {
        return new Promise((resolve, reject) => {
            const onTimeout = setTimeout(() => {
                resolve();
                abortSignal?.removeEventListener('abort', onAbort);
            }, milliseconds);

            const onAbort = () => {
                clearTimeout(onTimeout);
                reject(new DOMException('Aborted.', 'AbortError'));
            };

            abortSignal?.addEventListener('abort', onAbort);
        });
    }

    /**
     * 指定の時間の間隔で関数を実行します。
     * @param {number} milliseconds ミリ秒。
     * @param {Function} action 関数。
     * @param {AbortSignal} abortSignal 中止シグナル。
     * @throws {DOMException} 中止エラー。
     */
    static interval(milliseconds, action, abortSignal) {
        return new Promise((resolve, reject) => {
            const onInterval = setInterval(() => {
                action();
                resolve();
                abortSignal?.removeEventListener('abort', onAbort);
            }, milliseconds);

            const onAbort = () => {
                clearInterval(onInterval);
                reject(new DOMException('Aborted.', 'AbortError'));
            };

            abortSignal?.addEventListener('abort', onAbort);
        });
    }
}

const app = new App();
app.run();
