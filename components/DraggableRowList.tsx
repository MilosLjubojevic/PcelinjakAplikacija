import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector, State } from 'react-native-gesture-handler';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

type ItemLayout = { y: number; height: number };

type DraggableItemProps = {
  itemId: string;
  activeId: SharedValue<string>;
  dragTranslateY: SharedValue<number>;
  displacements: SharedValue<Record<string, number>>;
  swapTargetId: SharedValue<string>;
  layouts: SharedValue<Record<string, ItemLayout>>;
  rowIds: SharedValue<string[]>;
  onReorderJS: (fromId: string, toIndex: number) => void;
  onLayoutUpdate: (id: string, layout: ItemLayout) => void;
  onDragStartJS: () => void;
  onDragEndJS: () => void;
  children: ReactNode;
};

function DraggableItem({
  itemId,
  activeId,
  dragTranslateY,
  displacements,
  swapTargetId,
  layouts,
  rowIds,
  onReorderJS,
  onLayoutUpdate,
  onDragStartJS,
  onDragEndJS,
  children,
}: DraggableItemProps) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(500)
        .onStart(() => {
          'worklet';
          activeId.value = itemId;
          dragTranslateY.value = 0;
          runOnJS(onDragStartJS)();
        })
        .onUpdate((e) => {
          'worklet';
          if (activeId.value !== itemId) return;
          dragTranslateY.value = e.translationY;

          const activeLayout = layouts.value[itemId];
          if (!activeLayout) return;
          const ids = rowIds.value;
          const currentIndex = ids.indexOf(itemId);
          if (currentIndex === -1) return;

          const newCenterY = activeLayout.y + activeLayout.height / 2 + e.translationY;
          let targetIdx = currentIndex;

          for (let i = 0; i < ids.length; i++) {
            const l = layouts.value[ids[i]];
            if (!l) continue;
            if (newCenterY >= l.y && newCenterY < l.y + l.height) {
              targetIdx = i;
              break;
            }
          }
          if (ids.length > 0) {
            const firstL = layouts.value[ids[0]];
            const lastL = layouts.value[ids[ids.length - 1]];
            if (firstL && newCenterY < firstL.y) targetIdx = 0;
            if (lastL && newCenterY >= lastL.y + lastL.height) targetIdx = ids.length - 1;
          }

          swapTargetId.value = targetIdx !== currentIndex ? ids[targetIdx] : '';

          const newD: Record<string, number> = {};
          for (let i = 0; i < ids.length; i++) newD[ids[i]] = 0;
          if (targetIdx !== currentIndex) {
            const dir = targetIdx > currentIndex ? 1 : -1;
            const from = Math.min(currentIndex, targetIdx);
            const to = Math.max(currentIndex, targetIdx);
            for (let i = from; i <= to; i++) {
              if (ids[i] !== itemId) {
                newD[ids[i]] = -dir * activeLayout.height;
              }
            }
          }
          displacements.value = newD;
        })
        .onEnd((e) => {
          'worklet';
          if (activeId.value !== itemId) return;

          const activeLayout = layouts.value[itemId];
          const ids = rowIds.value;
          const currentIndex = ids.indexOf(itemId);

          let targetIdx = currentIndex;
          if (activeLayout && currentIndex !== -1) {
            const newCenterY = activeLayout.y + activeLayout.height / 2 + e.translationY;
            for (let i = 0; i < ids.length; i++) {
              const l = layouts.value[ids[i]];
              if (!l) continue;
              if (newCenterY >= l.y && newCenterY < l.y + l.height) {
                targetIdx = i;
                break;
              }
            }
            if (ids.length > 0) {
              const firstL = layouts.value[ids[0]];
              const lastL = layouts.value[ids[ids.length - 1]];
              if (firstL && newCenterY < firstL.y) targetIdx = 0;
              if (lastL && newCenterY >= lastL.y + lastL.height) targetIdx = ids.length - 1;
            }
          }

          swapTargetId.value = '';

          if (targetIdx !== currentIndex) {
            // Immediately clear animations so the state update (optimistic) renders
            // the item at its new DOM position with translateY = 0 — no snap-back.
            runOnJS(onReorderJS)(itemId, targetIdx);
            activeId.value = '';
            dragTranslateY.value = 0;
            displacements.value = {};
            runOnJS(onDragEndJS)();
          } else {
            // No reorder — spring back to original slot
            dragTranslateY.value = withSpring(
              0,
              { damping: 20, stiffness: 200 },
              () => {
                'worklet';
                activeId.value = '';
                displacements.value = {};
                runOnJS(onDragEndJS)();
              }
            );
          }
        })
        .onFinalize((e) => {
          'worklet';
          if (activeId.value !== itemId) return;
          swapTargetId.value = '';
          // Normal end already handled by onEnd — don't interrupt its spring/clear.
          if (e.state === State.END) return;
          // Cancelled / failed — clean up immediately.
          activeId.value = '';
          dragTranslateY.value = 0;
          displacements.value = {};
          runOnJS(onDragEndJS)();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemId, activeId, dragTranslateY, displacements, swapTargetId, layouts, rowIds, onReorderJS, onDragStartJS, onDragEndJS],
  );

  const animStyle = useAnimatedStyle(() => {
    const isActive = activeId.value === itemId;
    const isSwapTarget = !isActive && swapTargetId.value === itemId;
    return {
      transform: [
        { translateY: isActive ? dragTranslateY.value : (displacements.value[itemId] ?? 0) },
        { scale: isActive ? 1.03 : (isSwapTarget ? 0.96 : 1) },
      ],
      zIndex: isActive ? 100 : 1,
      opacity: isSwapTarget ? 0.6 : 1,
      shadowColor: '#000',
      shadowOpacity: isActive ? 0.25 : 0,
      shadowRadius: isActive ? 10 : 0,
      shadowOffset: { width: 0, height: isActive ? 5 : 0 },
      elevation: isActive ? 10 : 1,
    };
  });

  // onLayout must be on an outer View ABOVE GestureDetector.
  // GestureDetector creates its own native wrapper, so anything inside it
  // reports y=0 relative to that wrapper — making all items look co-located
  // and breaking the swap hit-test. The outer View measures correctly against
  // the common scroll-content ancestor.
  return (
    <View
      onLayout={(e) =>
        onLayoutUpdate(itemId, {
          y: e.nativeEvent.layout.y,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      <GestureDetector gesture={gesture}>
        <Reanimated.View style={animStyle}>
          {children}
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}

export type DraggableRowListProps<T extends { id: string }> = {
  rows: T[];
  renderRow: (row: T) => ReactNode;
  onReorder: (reordered: T[]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
};

export function DraggableRowList<T extends { id: string }>({
  rows,
  renderRow,
  onReorder,
  onDragStart,
  onDragEnd,
  disabled = false,
}: DraggableRowListProps<T>) {
  const activeId = useSharedValue('');
  const dragTranslateY = useSharedValue(0);
  const displacements = useSharedValue<Record<string, number>>({});
  const swapTargetId = useSharedValue('');
  const layouts = useSharedValue<Record<string, ItemLayout>>({});
  const rowIds = useSharedValue<string[]>([]);

  useEffect(() => {
    const ids = rows.map((r) => r.id);
    if (ids.length !== rowIds.value.length || ids.some((id, index) => rowIds.value[index] !== id)) {
      rowIds.value = ids;
    }
  }, [rows, rowIds]);

  const handleLayoutUpdate = useCallback(
    (id: string, layout: ItemLayout) => {
      layouts.value = { ...layouts.value, [id]: layout };
    },
    [layouts],
  );

  const handleReorder = useCallback(
    (fromId: string, toIndex: number) => {
      const fromIndex = rows.findIndex((r) => r.id === fromId);
      if (fromIndex === -1 || fromIndex === toIndex) return;
      const newRows = [...rows];
      const [moved] = newRows.splice(fromIndex, 1);
      newRows.splice(toIndex, 0, moved);
      onReorder(newRows);
    },
    [rows, onReorder],
  );

  const handleDragStart = useCallback(() => { onDragStart?.(); }, [onDragStart]);
  const handleDragEnd = useCallback(() => { onDragEnd?.(); }, [onDragEnd]);

  if (disabled) {
    return <>{rows.map((row) => <View key={row.id}>{renderRow(row)}</View>)}</>;
  }

  return (
    <>
      {rows.map((row) => (
        <DraggableItem
          key={row.id}
          itemId={row.id}
          activeId={activeId}
          dragTranslateY={dragTranslateY}
          displacements={displacements}
          swapTargetId={swapTargetId}
          layouts={layouts}
          rowIds={rowIds}
          onReorderJS={handleReorder}
          onLayoutUpdate={handleLayoutUpdate}
          onDragStartJS={handleDragStart}
          onDragEndJS={handleDragEnd}
        >
          {renderRow(row)}
        </DraggableItem>
      ))}
    </>
  );
}
