import { StateCard } from "@/components/ui/state-card";

export default function RootLoading() {
  return (
    <main className="app-shell-root mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-14 md:px-6">
      <div className="w-full">
        <StateCard
          variant="loading"
          title="页面正在准备中"
          description="我们正在整理当前页面需要的数据和视图状态，请稍等一下。"
        />
      </div>
    </main>
  );
}
