import { ExperienceTopNav } from "@/components/experience/experience-top-nav";

import styles from "./template-frame.module.css";

interface ExperienceTemplateFrameProps {
  html: string;
  title: string;
}

export function ExperienceTemplateFrame({ html, title }: ExperienceTemplateFrameProps) {
  return (
    <div className={styles.shell}>
      <ExperienceTopNav />
      <div className={styles.frameWrap}>
        <iframe
          title={title}
          srcDoc={html}
          className={styles.frame}
        />
      </div>
    </div>
  );
}
