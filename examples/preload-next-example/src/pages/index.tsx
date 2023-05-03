import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { LinkPreload } from "../../../../";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { PrismLight } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import tsx from "react-syntax-highlighter/dist/cjs/languages/prism/tsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "react-query";
import { ClipLoader, GridLoader } from "react-spinners";
const inter = Inter({ subsets: ["latin"] });

PrismLight.registerLanguage("tsx", tsx);
export const Header = () => {
  return (
    <header className="w-full px-10 py-4 flex items-center gap-6">
      <Link href="/">
        <h2>Preload Link</h2>
      </Link>
    </header>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <Header />
      <main className="flex-1 h-full w-full  py-20 px-52">{children}</main>
    </div>
  );
};

const ProviderTemplate = `import { PreloadProvider } from "preload-next";
import { QueryClient, QueryClientProvider } from "react-query";

export type PreloadContext = {
  queryClient: QueryClient;
};

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <PreloadProvider
        resolve={{
          queryClient,
        }}
      >
        <Component {...pageProps} />
      </PreloadProvider>
    </QueryClientProvider>
  );
}
`;

const PokemonTemplate = `import dynamic from "next/dynamic";
import { NextPageContext } from "next/types";
import { useQuery } from "react-query";
import { PreloadContext } from "./_app";

type Pokemon = {
  name: string;
};

const preload = async ({ queryClient }: PreloadContext) => {
  if (!queryClient.getQueryCache().find("pokemon")) {
    queryClient.prefetchQuery("pokemon", getPokemons);
  }
};

const getInitialProps = async (ctx: NextPageContext) => {
  if (typeof window === "undefined") {
    const { QueryClient, dehydrate } = await import("react-query");
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery("pokemon", getPokemons);
    return {
      dehydratedState: dehydrate(queryClient),
    };
  }

  return {};
};

const getPokemons = async (): Promise<Pokemon[]> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon");
      resolve((await response.json()).results);
    }, 500);
  });
};

const PokemonPage = () => {
  const { data: pokemons, isLoading } = useQuery("pokemon", getPokemons);

  return (
      <ul>
        {pokemons &&
          pokemons.map((pokemon: any) => (
            <li key={pokemon.name}>{pokemon.name}</li>
          ))}

        {isLoading && <li>Loading...</li>}
      </ul>
  );
};

PokemonPage.preload = preload;
PokemonPage.getInitialProps = getInitialProps;

export default dynamic(() => Promise.resolve(PokemonPage), {
  ssr: false,
}) as any;

`;

const Usage = () => {
  return (
    <div className="flex flex-col w-full h-full  gap-16">
      <h2>
        Usage with <code>react-query</code>
      </h2>
      <div className="flex w-full h-full  gap-16">
        <div className="flex-1">
          <h3>
            How to use <code>preload-next</code> with <code>react-query</code>
          </h3>
          <p>
            This example shows how to use <code>preload-next</code> with{" "}
            <code>react-query</code>. The <code>react-query</code> client is
            passed to <code>preload-next</code> via the{" "}
            <code>PreloadProvider</code> component. The{" "}
            <code>PreloadProvider</code>
          </p>
          <div className="mt-10">
            <h4>
              Add the <code>PreloadProvider</code> to your app
            </h4>
            <SyntaxHighlighter style={dracula} language="tsx">
              {ProviderTemplate}
            </SyntaxHighlighter>
          </div>
        </div>
        <div className="flex-1">
          <SyntaxHighlighter style={dracula} language="tsx">
            {PokemonTemplate}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

const Divider = () => {
  return <div className="w-full my-4 h-px bg-gray-200" />;
};

type Request = {
  url: string;
  method: string;
  status: number | null;
  loading: boolean;
};
const Console = ({
  requests,
}: {
  requests: Request[];
  clearCache: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [requests]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h3>Network requests</h3>
          <p>
            Open up your network tab to actually see the requests being made.
          </p>
        </div>
      </div>
      <Divider />
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <div
            ref={ref}
            className="flex-1 flex  max-h-60 flex-col overflow-y-scroll gap-4"
          >
            {requests.map((request, index) => (
              <div key={index} className="flex items-center gap-4  p-4 rounded">
                <div className="h-full py-1">
                  {request.loading && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full" />
                  )}
                  {request.status === 200 && (
                    <div className="w-4 h-4 bg-green-500 rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-bold">{request.method}</div>
                    <div className="text-sm">{request.url}</div>
                  </div>
                  <div className="text-sm">
                    {request.status === 200 && (
                      <span className="text-green-500">200 OK</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Demo = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [hover, setHover] = useState(false);
  const [isCacheCleared, setIsCacheCleared] = useState(false);
  const queryClient = useQueryClient();

  const clearCache = () => {
    queryClient.clear();
    setIsCacheCleared(true);
    setHover(false);
  };

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (hover) {
      setRequests((requests) => [
        ...requests,
        {
          url: "/pokemon",
          method: "GET",
          status: null,
          loading: true,
        },
      ]);

      setTimeout(() => {
        setRequests((requests) =>
          requests.map((request) => {
            if (request.url === "/pokemon") {
              return {
                ...request,
                loading: false,
                status: 200,
              };
            }

            return request;
          })
        );
      }, 300);
    }
  }, [hover]);

  return (
    <div className="flex h-[300px] gap-10">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2>
            Demo of <code>preload-next</code>
          </h2>
          <button
            onClick={() => {
              setIsLoading(true);
              clearCache();

              setTimeout(() => {
                setIsLoading(false);
              }, 500);
            }}
            className="transition flex items-center justify-center h-[40px] w-32 active:scale-95 duration-200 ml-4  rounded bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
          >
            {isLoading ? <ClipLoader color="white" size={20} /> : "Clear cache"}
          </button>
        </div>
        <p>
          Hover over the <code>Pokemon</code> link/button to see the magic
          happen. when you hover over the link, the preload function will be
          called and the request will be made. and the data will be cached for
          the next page load.
        </p>
        <div className="mt-10 flex-1">
          <LinkPreload prefetch={false} href="/pokemon">
            <span
              className="bg-blue-500 hover:cursor-pointer hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onMouseEnter={() => setHover(true)}
            >
              Pokemon
            </span>
          </LinkPreload>
        </div>
      </div>

      <Console clearCache={clearCache} requests={requests} />
    </div>
  );
};
const Home = () => {
  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <Demo />
        <Divider />
        <Usage />
      </div>
    </Layout>
  );
};

export default dynamic(() => Promise.resolve(Home), {
  ssr: false,
}) as any;
