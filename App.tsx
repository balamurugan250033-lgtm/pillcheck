import { AppRegistry } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { name as appName } from './app.json';

const App = () => <AppNavigator />;

AppRegistry.registerComponent(appName, () => App);

export default App;
