import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { ProductWithOptions } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/designTokens';

interface LowStockAlertProps {
  products: ProductWithOptions[];
  threshold?: number;
}

export default function LowStockAlert({ products, threshold = 5 }: LowStockAlertProps) {
  const lowStockItems = products.flatMap((product) =>
    product.price_options
      .filter((opt) => opt.stock <= threshold)
      .map((opt) => ({
        productName: product.product_name,
        size: opt.size,
        stock: opt.stock,
      }))
  );

  if (lowStockItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={20} color={COLORS.danger} />
        <AppText style={styles.title}>
          Nizak nivo zaliha ({lowStockItems.length})
        </AppText>
      </View>
      {lowStockItems.slice(0, 5).map((item, index) => (
        <View key={`${item.productName}-${item.size}-${index}`} style={styles.item}>
          <AppText style={styles.itemName} numberOfLines={1}>
            {item.productName} - {item.size}
          </AppText>
          <AppText style={[styles.itemStock, item.stock === 0 && styles.outOfStock]}>
            {item.stock === 0 ? 'Nema' : `${item.stock} kom`}
          </AppText>
        </View>
      ))}
      {lowStockItems.length > 5 && (
        <AppText style={styles.moreText}>
          + još {lowStockItems.length - 5} artikala
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.danger,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  itemName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  itemStock: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.danger,
    marginLeft: SPACING.md,
  },
  outOfStock: {
    fontWeight: '700',
  },
  moreText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
