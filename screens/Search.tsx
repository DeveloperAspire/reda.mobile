import { MaterialIcons } from "@expo/vector-icons";
import { NavigationProp } from "@react-navigation/native";
import { Box, FlatList, Flex, Icon, Input, Pressable, Text } from "native-base";
import { useEffect, useState } from "react";
import { Alert, useWindowDimensions } from "react-native";
import SearchInput from "../components/reusables/SearchInput";
import SearchCard from "../components/cards/SearchCard";
import { InputProps } from "../constants/props";
import { CombinedFileResultType } from "../types/database";
import { RedaService } from "../utils/internal.util";

interface SearchProps {
  route: any;
  navigation: NavigationProp<any>;
}

export default function Search({ route, navigation }) {
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState<string>("");
  const [results, setResults] = useState<CombinedFileResultType[]>([]);

  useEffect(() => {
    if (search.length >= 2) {
      RedaService.search(search)
        .then(setResults)
        .catch((_) => Alert.alert("Error", "Something went wrong!"));
    } else if (search.length == 0) {
      setResults([]);
    }
  }, [search]);

  return (
    <FlatList
      data={results}
      renderItem={({ item, index }) => (
        <SearchCard data={item} navigation={navigation} />
      )}
      keyExtractor={(item, index) => index.toString()}
      ListHeaderComponent={
        <SearchHeader search={search} setSearch={setSearch} />
      }
      ListEmptyComponent={
        <Flex
          w={width * 0.9}
          alignItems="center"
          justifyContent="center"
          mx="auto"
          my={16}
        >
          <Box alignItems="center">
            <Icon
              as={MaterialIcons}
              name="folder"
              size={32}
              _dark={{ color: "muted.800" }}
              _light={{ color: "muted.300" }}
            />
            <Text
              fontSize={16}
              _dark={{ color: "muted.700" }}
              _light={{ color: "muted.400" }}
              mt={3}
            >
              No results...
            </Text>
          </Box>
        </Flex>
      }
      stickyHeaderIndices={[0]}
      px={3}
    />
  );
}

function SearchHeader({
  search,
  setSearch,
}: {
  search: string;
  setSearch: any;
}) {
  return (
    <Box
      w={"full"}
      _dark={{ bg: "brand-dark" }}
      _light={{ bg: "brand-light" }}
      py={3}
      mb={2}
    >
      <SearchInput search={search} setSearch={setSearch} />
    </Box>
  );
}