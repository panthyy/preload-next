# Preload Link NextJS
## Or rather prefetching, the terms confuse me.

A variant of the Link component in NextJS that will execute a preload function that is attached to the page to allow for preloading data on hover. Providing the illusion of a faster page load as the data is loaded when the user hovers over the link.

## Demo

https://preload-next-example.vercel.app

## Installation

```bash
yarn install preload-next
```
or 
```bash
npm install preload-next
```

## Usage

pages/index.tsx
```jsx
import { LinkPreload } from "preload-next";

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
```

pages/pokemon.tsx
```jsx

import dynamic from "next/dynamic";
import { NextPageContext } from "next/types";
import { useQuery } from "react-query";
import { PreloadContext } from "./_app";

type Pokemon = {
  name: string;
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
    <div>
      <h2>Pokemon</h2>

      <ul>
        {pokemons &&
          pokemons.map((pokemon: any) => (
            <li key={pokemon.name}>{pokemon.name}</li>
          ))}

        {isLoading && <li>Loading...</li>}
      </ul>
    </div>
  );
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

const PPage = dynamic(() => Promise.resolve(PokemonPage), {
  ssr: false,
}) as any;

PPage.preload = preload;
PPage.getInitialProps = getInitialProps;

export default PPage;
```
