# VOICEVOX voices for training the kana speech model

The speech model is trained on speech generated with VOICEVOX. VOICEVOX's own terms allow
commercial and non-commercial use and defer to each voice's terms, so every character's terms
were checked (October 2026) for whether its generated speech may be used to **train a machine
learning model**. The app ships only the trained weights, never the generated audio.

Rule: train on voices whose terms **allow** it or **don't mention** machine learning; leave out
voices that **forbid** it, ask to be contacted first, or whose terms couldn't be read or are
unclear. `voices.json` lists the voices we use, with their split; `kana_speech.generate` refuses
any other voice.

## Used (25 characters, 71 styles)

| Character                                                                            | Terms                                                                  | Verdict                                                                            | Split |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----- |
| 四国めたん, ずんだもん, 中部つるぎ, 東北ずん子, 東北きりたん, 東北イタコ, あんこもん | [zunko.jp](https://zunko.jp/con_ongen_kiyaku.html)                     | not mentioned                                                                      | train |
| 九州そら                                                                             | [zunko.jp](https://zunko.jp/con_ongen_kiyaku.html)                     | not mentioned                                                                      | val   |
| 中国うさぎ                                                                           | [zunko.jp](https://zunko.jp/con_ongen_kiyaku.html)                     | not mentioned                                                                      | test  |
| 春日部つむぎ                                                                         | [rule](https://tsumugi-official.studio.site/rule)                      | not mentioned (the 学習 clause is about MMVC's training data, not VOICEVOX speech) | train |
| 雨晴はう                                                                             | [terms](https://amehau.com/?page_id=225)                               | not mentioned (only voice-changer models are banned)                               | test  |
| 波音リツ                                                                             | [terms](https://www.canon-voice.com/terms)                             | not mentioned                                                                      | test  |
| 冥鳴ひまり                                                                           | [terms](https://www.meimeihimari.com/terms-of-use)                     | not mentioned                                                                      | test  |
| 剣崎雌雄                                                                             | [terms](https://frontier.creatia.cc/fanclubs/413/posts/4507)           | not mentioned                                                                      | test  |
| No.7                                                                                 | [terms](https://voiceseven.com/#j0200)                                 | not mentioned                                                                      | train |
| 櫻歌ミコ                                                                             | [rule](https://voicevox35miko.studio.site/rule)                        | not mentioned (voice changers made with machine learning are explicitly allowed)   | train |
| 小夜/SAYO                                                                            | [guideline](https://316soramegu.wixsite.com/sayo-official/guideline)   | not mentioned                                                                      | val   |
| †聖騎士 紅桜†                                                                        | [terms](https://commons.nicovideo.jp/works/nc296132)                   | not mentioned                                                                      | val   |
| 春歌ナナ                                                                             | [guideline](https://nanahira.jp/haruka_nana/guideline.html)            | not mentioned                                                                      | val   |
| 栗田まろん                                                                           | [terms](https://aivoice.jp/character/maron/)                           | not mentioned                                                                      | train |
| あいえるたん                                                                         | [terms](https://www.infiniteloop.co.jp/special/iltan/terms/)           | **allowed** (「機械学習」 is listed as a permitted use)                            | train |
| 満別花丸                                                                             | [rule](https://100hanamaru.wixsite.com/manbetsu-hanamaru/rule)         | not mentioned                                                                      | train |
| ユーレイちゃん                                                                       | [terms](https://u-stella.co.jp/voicevox-ure-chan-tucumo-terms-of-use/) | not mentioned                                                                      | train |
| 夜語トバリ, 暁記ミタマ                                                               | [rules](https://yogataritobari.studio.site/#rules)                     | not mentioned                                                                      | train |

Splits are by character, so validation and test voices are new to the model.

## Not used

| Character                                                      | Terms                                                                                        | Why                                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 玄野武宏, 白上虎太郎, 青山龍星, 雀松朱司, 麒ヶ島宗麟, 黒沢冴白 | [VirVox](https://www.virvoxproject.com/voicevoxの利用規約)                                   | forbidden: 「機械学習、転移学習やファインチューニング等で新たな音響モデルなどを生成すること」         |
| WhiteCUL                                                       | [guideline](https://www.whitecul.com/guideline)                                              | forbidden: same clause as VirVox                                                                      |
| 後鬼                                                           | [terms](https://ついなちゃん.com/voicevox_terms/)                                            | forbidden: 「機械学習…で新たな音響モデル、ボイスチェンジャーなどを生成すること」                      |
| もち子さん                                                     | [terms](https://vtubermochio.wixsite.com/mochizora/利用規約)                                 | forbidden: 「…AI学習」                                                                                |
| ナースロボ＿タイプＴ                                           | [rules](https://www.krnr.top/rules)                                                          | forbidden: 「出力音声を他のAIに機械学習させる・取り込む行為」                                         |
| 猫使アル, 猫使ビィ                                             | [terms](https://nekotukarb.wixsite.com/nekonohako/利用規約)                                  | forbidden: 「機械学習等で音響モデル…データセットなどを構築/生成すること」                             |
| Voidoll                                                        | [terms](https://blog.nicovideo.jp/niconews/224589.html)                                      | forbidden: 「機械学習に使用することを禁止」                                                           |
| 離途                                                           | [rules](https://litmus9.com/voicebank)                                                       | forbidden: 「音声波形を機械学習に利用すること」                                                       |
| 里石ユカ                                                       | [terms](https://satoishiyuka.wixsite.com/satoishi/kiyaku)                                    | forbidden: 「AI技術による機械学習、データセット作成、またはモデル訓練の目的で使用することを一切禁止」 |
| ちび式じい                                                     | [terms](https://docs.google.com/presentation/d/1AcD8zXkfzKFf2ertHwWRwJuQXjNnijMxhz7AJzEkaI4) | ask first: 「機械学習のデータとして使用する場合、…ご連絡下さい」                                      |
| ぞん子                                                         | [guideline](https://zonko.zone-energy.jp/guideline)                                          | unclear: the guideline is written for fan works                                                       |
| 琴詠ニア                                                       | [terms](https://commons.nicovideo.jp/works/nc315435)                                         | couldn't be read                                                                                      |

Most male voices are among the forbidden ones (all six VirVox characters), so the training voices
lean female and young. Training makes up for some of that with pitch and vocal-tract-length
variation, and a male voice (剣崎雌雄) is held out for testing.

Terms change: check them again before training a new model version.
