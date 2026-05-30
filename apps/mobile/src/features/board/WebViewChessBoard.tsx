import { useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { boardHtml } from './boardHtml';
import { BoardOutboundMessage } from './boardMessages';
import { ChessBoardProps } from './types';
import { colors } from '@/theme/colors';

export function WebViewChessBoard(props: ChessBoardProps) {
  const ref = useRef<WebView>(null);
  const size = Math.min(Dimensions.get('window').width - 32, 420);

  const stateJson = useMemo(
    () =>
      JSON.stringify({
        type: 'setPosition',
        fen: props.fen,
        side: props.side,
        lastMove: props.lastMove ?? null,
        arrows: props.arrows ?? [],
        showCoordinates: props.showCoordinates ?? true,
        disabled: props.disabled ?? false,
        positionVersion: props.positionVersion ?? 0,
      }),
    [props.arrows, props.disabled, props.fen, props.lastMove, props.positionVersion, props.showCoordinates, props.side],
  );

  useEffect(() => {
    ref.current?.injectJavaScript(`window.__setBoardState(${stateJson}); true;`);
  }, [stateJson]);

  function handleMessage(event: WebViewMessageEvent): void {
    const message = JSON.parse(event.nativeEvent.data) as BoardOutboundMessage;
    if (message.type === 'move') props.onMove?.(message.uci);
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: boardHtml }}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
