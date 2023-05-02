import dynamic from "next/dynamic";
import { NextPageContext } from "next/types";
import { useQuery } from "react-query";
import { Layout } from ".";
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
  const response = await fetch("https://pokeapi.co/api/v2/pokemon");
  return (await response.json()).results;
};

const PokemonPage = () => {
  const { data: pokemons, isLoading } = useQuery("pokemon", getPokemons);

  return (
    <Layout>
      <ul>
        {pokemons &&
          pokemons.map((pokemon: any) => (
            <li key={pokemon.name}>{pokemon.name}</li>
          ))}
        {isLoading && <li>Loading...</li>}
      </ul>
    </Layout>
  );
};

PokemonPage.preload = preload;
PokemonPage.getInitialProps = getInitialProps;

export default PokemonPage;
