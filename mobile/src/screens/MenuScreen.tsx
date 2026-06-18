import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface MenuScreenProps {
  slug: string;
  tableId?: string;
  baseUrl: string;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ slug, tableId, baseUrl }) => {
  let uri = `${baseUrl}/r/${slug}`;
  if (tableId) {
    uri += `/table/${tableId}/menu`;
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsBackForwardNavigationGestures
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});

export default MenuScreen;
