"use client";

import { useState } from "react";

import styles from "./embedded-route-frame.module.css";

interface EmbeddedRouteFrameProps {
  src: string;
  title: string;
  testId?: string;
}

export function EmbeddedRouteFrame({ src, title, testId }: EmbeddedRouteFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const shellTestId = testId ? `${testId}-shell` : undefined;

  return (
    <main className={styles.page} aria-label={title} data-testid={shellTestId}>
      <section className={styles.shellCard}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>Experience 嵌入视图</div>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.copy}>这里承接主页面的嵌入壳层，保持标题、载入状态和浏览结构稳定一致。</p>
            </div>
            <div className={styles.status} data-loaded={loaded ? "true" : "false"}>
              {loaded ? "已连接" : "正在载入"}
            </div>
          </div>
        </header>

        <div className={styles.frameWrap}>
          {!loaded ? (
            <div className={styles.loadingCard} aria-hidden="true">
              <div className={styles.loadingPulse} />
              <div className={styles.loadingTitle} />
              <div className={styles.loadingLine} />
              <div className={styles.loadingLineShort} />
            </div>
          ) : null}

          <iframe
            src={src}
            title={title}
            loading="eager"
            className={styles.frame}
            data-testid={testId}
            data-loaded={loaded ? "true" : "false"}
            onLoad={() => setLoaded(true)}
          />
        </div>
      </section>
    </main>
  );
}
