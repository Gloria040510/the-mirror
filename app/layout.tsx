import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'The Mirror · 认知回声室',
  description: '同一个问题，三种提问方式。亲自观察立场、质疑和新证据如何改变 AI 的回答。',
};
export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
