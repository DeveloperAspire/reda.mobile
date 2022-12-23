import {Feather} from "@expo/vector-icons";
import constants from "expo-constants"
import {Box, Divider, Heading, HStack, Icon, Pressable, ScrollView, Switch, Text, useColorMode} from "native-base";
import {ReactNode, useContext} from "react";
import {FontFamiliesEnum} from "../constants/fonts";
import {DividerProps, HStackProps, PressableProps} from "../constants/props";
import {GlobalContext} from "../context/GlobalContext";
import SettingsUtil from "../utils/settings.util";

export default function Settings() {
	const {toggleColorMode, colorMode} = useColorMode();
	const {state, dispatch} = useContext(GlobalContext);


	const settingsUtil = new SettingsUtil(dispatch);

	const handleFontSizeChange = (value: string) => settingsUtil.setFontSize(value);

	const handleFontFamilyChange = (value: string) => settingsUtil.setFontFamily(value as FontFamiliesEnum);

	const handleSettingsReset = () => settingsUtil.resetSettings();

	return (
	  <ScrollView px={3}>
		  <Box safeAreaTop>
			  <Heading fontSize={44} mt={4} ml={2}>Settings</Heading>
			  <SettingsSection title="Appearance">
				  <HStack {...HStackProps}>
					  <Text>Dark Mode</Text>
					  <Switch size="md" _android={{size: "lg"}} onTrackColor="green.500" onToggle={toggleColorMode} value={(colorMode === "dark")}/>
				  </HStack>
				  <Box pl={4}><Divider {...DividerProps} /></Box>
				  <HStack {...HStackProps}>
					  <Text>Single-page Layout</Text>
					  <Switch size="md" _android={{size: "lg"}} onTrackColor="green.500" onToggle={settingsUtil.toggleSinglePageLayout} value={state.useSinglePageLayout}/>
				  </HStack>
			  </SettingsSection>

			  <SettingsSection title="User & App Data">
				  <Pressable
					onPress={handleSettingsReset}
					{...PressableProps}
				  >
					  <Box px={4} py={4}>
						  <Text color="red.500">Reset settings</Text>
					  </Box>
				  </Pressable>
				  <Box pl={4}><Divider {...DividerProps} /></Box>
				  <Pressable
					onPress={settingsUtil.clearAllData}
					{...PressableProps}
				  >
					  <HStack alignItems="center" space={2} px={4} py={4}>
						  <Icon as={Feather} name="trash-2" size={4} color="red.500"/>
						  <Text color="red.500">Clear data</Text>
					  </HStack>
				  </Pressable>
			  </SettingsSection>


			  <Text textAlign="center" fontSize={13} color="gray.400" fontWeight={400} mt={10}>
				  v{constants?.manifest?.version} {Number(constants?.manifest?.version || "1") >= 1.0 ? "-stable" : "-beta"}
			  </Text>
		  </Box>
	  </ScrollView>
	);
}

const SettingsSection = ({title, children}: { title: string, children: ReactNode }) => (
  <Box
	_dark={{bg: "muted.900", borderColor: "muted.800"}}
	_light={{bg: "muted.100", borderColor: "muted.200"}}
	mt={6}
	rounded={10}
  >
	  <Box>
		  {children}
	  </Box>
  </Box>
)