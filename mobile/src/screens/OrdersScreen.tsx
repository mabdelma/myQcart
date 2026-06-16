import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native';

type Props = NativeStackScreenProps<{ Orders: { slug?: string } }, 'Orders'>;

const OrdersScreen: React.FC<Props> = ({ route }) => {
  const slug = route.params?.slug ?? 'demo-cafe';
  const uri = `https://qcart.gmtmall.com/r/${slug}/orders`;

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
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default OrdersScreen;
