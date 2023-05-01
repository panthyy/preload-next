import dynamic from "next/dynamic";
import { NextPageContext } from "next/types";
import { useQuery } from "react-query";
import { PreloadContext } from "preload-next";

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
