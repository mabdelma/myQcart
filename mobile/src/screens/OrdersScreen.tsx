import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface OrdersScreenProps {
  slug: string;
  baseUrl: string;
}

const OrdersScreen: React.FC<OrdersScreenProps> = ({ slug, baseUrl }) => {
  const uri = `${baseUrl}/r/${slug}/orders`;

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

export default OrdersScreen;
