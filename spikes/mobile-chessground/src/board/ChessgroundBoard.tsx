import { View } from 'react-native';
import ChessgroundBoardDom from './ChessgroundBoard.dom';
import type { ChessgroundBoardProps } from './board.types';

export function ChessgroundBoard({ size, ...props }: ChessgroundBoardProps) {
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <ChessgroundBoardDom
        {...props}
        dom={{
          scrollEnabled: false,
          bounces: false,
          style: { width: size, height: size, backgroundColor: 'transparent' },
          containerStyle: { width: size, height: size, backgroundColor: 'transparent' },
        }}
      />
    </View>
  );
}
