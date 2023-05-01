import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { LinkPreload } from "preload-next";

const inter = Inter({ subsets: ["latin"] });

export const Header = () => {
  return (
    <div>
      <h1>Header</h1>
      <nav>
        <LinkPreload prefetch={false} href="/pokemon">
          Pokemon
        </LinkPreload>
      </nav>
    </div>
  );
};
const Home = () => {
  return (
    <div>
      <Header />
      <h2>Hello</h2>
    </div>
  );
};

export default dynamic(() => Promise.resolve(Home), {
  ssr: false,
}) as any;
