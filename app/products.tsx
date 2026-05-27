import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import AppText from "../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSupabase } from "../context/SupabaseContext";
import { Product, ProductPriceOption, ProductWithOptions } from "../types";
import { uploadProductImage, getImageUrl } from "../utils/supabase";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Picker, { PickerOption } from "../components/Picker";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import LowStockAlert from "../components/LowStockAlert";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

const productTypeOptions: PickerOption[] = [
  { label: "Med", value: "Med" },
  { label: "Voćni Med", value: "Voćni Med" },
  { label: "Polen", value: "Polen" },
  { label: "Preparati", value: "Preparati" },
];

export default function ProductsScreen() {
  const {
    isConfigured,
    products,
    productsLoading,
    productsError,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addPriceOption,
    updatePriceOption,
    deletePriceOption,
  } = useSupabase();

  const [modalVisible, setModalVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithOptions | null>(null);
  const [editingPriceOption, setEditingPriceOption] = useState<ProductPriceOption | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    product_name: "",
    desc: "",
    image: "",
    alt: "",
    type: "Med",
  });

  const [priceFormData, setPriceFormData] = useState({
    size: "",
    price: "",
    stock: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setFormData({
      product_name: "",
      desc: "",
      image: "",
      alt: "",
      type: "Med",
    });
    setEditingProduct(null);
  };

  const resetPriceForm = () => {
    setPriceFormData({
      size: "",
      price: "",
      stock: "",
    });
    setEditingPriceOption(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (product: ProductWithOptions) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name,
      desc: product.desc || "",
      image: product.image || "",
      alt: product.alt || "",
      type: product.type || "",
    });
    setModalVisible(true);
  };

  const openAddPriceModal = (productId: number) => {
    resetPriceForm();
    setSelectedProductId(productId);
    setPriceModalVisible(true);
  };

  const openEditPriceModal = (option: ProductPriceOption) => {
    setEditingPriceOption(option);
    setSelectedProductId(option.product_id);
    setPriceFormData({
      size: option.size || "",
      price: option.price || "",
      stock: option.stock?.toString() || "0",
    });
    setPriceModalVisible(true);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Greška", "Potrebna je dozvola za pristup galeriji");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUploading(true);
      const asset = result.assets[0];
      const fileName = asset.uri.split("/").pop() || "image.jpg";

      const uploadedPath = await uploadProductImage(asset.uri, fileName);

      if (uploadedPath) {
        setFormData({ ...formData, image: uploadedPath });
      } else {
        Alert.alert("Greška", "Nije moguće otpremiti sliku");
      }
      setImageUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.product_name.trim()) {
      Alert.alert("Greška", "Naziv proizvoda je obavezan");
      return;
    }
    setSaving(true);

    if (editingProduct) {
      const success = await updateProduct(editingProduct.id, formData);
      if (!success) {
        setSaving(false);
        Alert.alert("Greška", "Nije moguće ažurirati proizvod");
        return;
      }
    } else {
      const newProduct = await addProduct(formData);
      if (!newProduct) {
        setSaving(false);
        Alert.alert("Greška", "Nije moguće dodati proizvod");
        return;
      }
    }

    setSaving(false);
    setModalVisible(false);
    resetForm();
  };

  const handleDeleteProduct = (product: ProductWithOptions) => {
    Alert.alert(
      "Obriši Proizvod",
      `Da li ste sigurni da želite da obrišete "${product.product_name}"? Ovo će obrisati i sve opcije cijena.`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const success = await deleteProduct(product.id);
            if (!success) {
              Alert.alert("Greška", "Nije moguće obrisati proizvod");
            }
          },
        },
      ]
    );
  };

  const handleSavePriceOption = async () => {
    if (!selectedProductId) return;

    if (!priceFormData.size.trim() || !priceFormData.price.trim()) {
      Alert.alert("Greška", "Veličina i cijena su obavezni");
      return;
    }
    setSaving(true);

    const optionData = {
      product_id: selectedProductId,
      size: priceFormData.size,
      price: priceFormData.price,
      stock: parseInt(priceFormData.stock) || 0,
    };

    if (editingPriceOption) {
      const success = await updatePriceOption(editingPriceOption.id, optionData);
      if (!success) {
        setSaving(false);
        Alert.alert("Greška", "Nije moguće ažurirati opciju cijene");
        return;
      }
    } else {
      const newOption = await addPriceOption(optionData);
      if (!newOption) {
        setSaving(false);
        Alert.alert("Greška", "Nije moguće dodati opciju cijene");
        return;
      }
    }

    setSaving(false);
    setPriceModalVisible(false);
    resetPriceForm();
  };

  const handleDeletePriceOption = (option: ProductPriceOption) => {
    Alert.alert(
      "Obriši Opciju Cijene",
      `Da li ste sigurni da želite da obrišete "${option.size}"?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const success = await deletePriceOption(option.id);
            if (!success) {
              Alert.alert("Greška", "Nije moguće obrisati opciju cijene");
            }
          },
        },
      ]
    );
  };

  const getPriceRange = (options: ProductPriceOption[]): string => {
    if (options.length === 0) return "Nema cijena";

    const prices = options.map((o) => parseFloat(o.price) || 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min === max) {
      return `${min.toLocaleString("sr-RS")} KM`;
    }
    return `${min.toLocaleString("sr-RS")} - ${max.toLocaleString("sr-RS")} KM`;
  };

  const getTotalStock = (options: ProductPriceOption[]): number => {
    return options.reduce((sum, o) => sum + (o.stock || 0), 0);
  };

  if (productsLoading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <AppText style={styles.loadingText}>Učitavanje...</AppText>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="settings-outline" size={64} color={COLORS.primary} />
        <AppText style={styles.configTitle}>Supabase nije konfigurisan</AppText>
        <AppText style={styles.configText}>
          Otvorite utils/supabase.ts i dodajte vaše Supabase kredencijale:{"\n\n"}
          - SUPABASE_URL{"\n"}
          - SUPABASE_ANON_KEY{"\n"}
          - STORAGE_BUCKET
        </AppText>
      </View>
    );
  }

  if (productsError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <AppText style={styles.errorText}>{productsError}</AppText>
        <Button title="Pokušaj ponovo" onPress={fetchProducts} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryLabel}>Proizvoda</AppText>
            <AppText style={styles.summaryValue}>{products.length}</AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText style={styles.summaryLabel}>Ukupno na stanju</AppText>
            <AppText style={styles.summaryValue}>
              {products.reduce((sum, p) => sum + getTotalStock(p.price_options), 0)}
            </AppText>
          </View>
        </View>
      </Card>

      <LowStockAlert products={products} threshold={5} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {products.length === 0 ? (
          <EmptyState
            icon="pricetag-outline"
            title="Nema proizvoda"
            message="Dodajte prvi proizvod da biste započeli"
            actionLabel="Dodaj Proizvod"
            onAction={openAddModal}
          />
        ) : (
          <View style={styles.productsList}>
            {products.map((product) => (
              <Card key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productImageContainer}>
                    {product.image ? (
                      <Image
                        source={{ uri: getImageUrl(product.image) }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image-outline" size={32} color={COLORS.textMuted} />
                      </View>
                    )}
                  </View>

                  <View style={styles.productInfo}>
                    <AppText style={styles.productName}>{product.product_name}</AppText>
                    {product.type && (
                      <View style={styles.typeBadge}>
                        <AppText style={styles.typeText}>{product.type}</AppText>
                      </View>
                    )}
                    <AppText style={styles.priceRange}>
                      {getPriceRange(product.price_options)}
                    </AppText>
                    <AppText style={styles.stockText}>
                      Na stanju: {getTotalStock(product.price_options)}
                    </AppText>
                  </View>

                  <View style={styles.productActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(product)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteProduct(product)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {product.desc && (
                  <AppText style={styles.productDesc} numberOfLines={2}>
                    {product.desc}
                  </AppText>
                )}

                {/* Price Options */}
                <View style={styles.priceOptionsSection}>
                  <View style={styles.priceOptionsHeader}>
                    <AppText style={styles.priceOptionsTitle}>Opcije cijena</AppText>
                    <TouchableOpacity
                      onPress={() => openAddPriceModal(product.id)}
                      style={styles.addPriceButton}
                    >
                      <Ionicons name="add-circle" size={24} color={COLORS.success} />
                    </TouchableOpacity>
                  </View>

                  {product.price_options.length === 0 ? (
                    <AppText style={styles.noPricesText}>Nema opcija cijena</AppText>
                  ) : (
                    <View style={styles.priceOptionsList}>
                      {product.price_options.map((option) => (
                        <View key={option.id} style={styles.priceOptionItem}>
                          <View style={styles.priceOptionInfo}>
                            <AppText style={styles.priceOptionSize}>{option.size}</AppText>
                            <AppText style={styles.priceOptionPrice}>
                              {parseFloat(option.price).toLocaleString("sr-RS")} KM
                            </AppText>
                            <AppText style={styles.priceOptionStock}>
                              Stanje: {option.stock}
                            </AppText>
                          </View>
                          <View style={styles.priceOptionActions}>
                            <TouchableOpacity
                              onPress={() => openEditPriceModal(option)}
                              style={styles.smallActionButton}
                            >
                              <Ionicons name="pencil" size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeletePriceOption(option)}
                              style={styles.smallActionButton}
                            >
                              <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Product Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        title={editingProduct ? "Izmijeni Proizvod" : "Novi Proizvod"}
      >
        <Input
          label="Naziv proizvoda *"
          value={formData.product_name}
          onChangeText={(text) => setFormData({ ...formData, product_name: text })}
          placeholder="Npr. Med, Propolis..."
        />

        <Input
          label="Opis"
          value={formData.desc}
          onChangeText={(text) => setFormData({ ...formData, desc: text })}
          placeholder="Opis proizvoda..."
          multiline
          numberOfLines={3}
        />

        <Picker
          label="Tip proizvoda"
          value={formData.type}
          options={productTypeOptions}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        />

        <View style={styles.imageSection}>
          <AppText style={styles.imageLabel}>Slika proizvoda</AppText>
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={pickImage}
            disabled={imageUploading}
          >
            {imageUploading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : formData.image ? (
              <Image
                source={{ uri: getImageUrl(formData.image) }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                <AppText style={styles.imagePickerText}>Izaberi sliku</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Input
          label="Alt tekst (za pristupačnost)"
          value={formData.alt}
          onChangeText={(text) => setFormData({ ...formData, alt: text })}
          placeholder="Opis slike..."
        />

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title={editingProduct ? "Sačuvaj" : "Dodaj"}
            onPress={handleSaveProduct}
            style={{ flex: 1, marginLeft: SPACING.sm }}
            disabled={imageUploading}
            loading={saving}
          />
        </View>
      </Modal>

      {/* Price Option Modal */}
      <Modal
        visible={priceModalVisible}
        onClose={() => {
          setPriceModalVisible(false);
          resetPriceForm();
        }}
        title={editingPriceOption ? "Izmijeni Opciju Cijene" : "Nova Opcija Cijene"}
      >
        <Input
          label="Veličina/Pakovanje *"
          value={priceFormData.size}
          onChangeText={(text) => setPriceFormData({ ...priceFormData, size: text })}
          placeholder="Npr. 1kg, 500g, 250ml..."
        />

        <Input
          label="Cijena (KM) *"
          value={priceFormData.price}
          onChangeText={(text) => setPriceFormData({ ...priceFormData, price: text })}
          placeholder="Npr. 15.00"
          keyboardType="decimal-pad"
        />

        <Input
          label="Količina na stanju"
          value={priceFormData.stock}
          onChangeText={(text) => setPriceFormData({ ...priceFormData, stock: text })}
          placeholder="0"
          keyboardType="number-pad"
        />

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setPriceModalVisible(false);
              resetPriceForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title={editingPriceOption ? "Sačuvaj" : "Dodaj"}
            onPress={handleSavePriceOption}
            loading={saving}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xxxl,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.danger,
    textAlign: "center",
    marginVertical: SPACING.lg,
  },
  configTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  configText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  summaryCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "bold",
    color: COLORS.success,
  },
  scrollView: {
    flex: 1,
  },
  productsList: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  productCard: {
    marginBottom: SPACING.md,
  },
  productHeader: {
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginRight: SPACING.md,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
    marginBottom: SPACING.xs,
  },
  typeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.surface,
  },
  priceRange: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.success,
  },
  stockText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  productActions: {
    flexDirection: "column",
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  productDesc: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  priceOptionsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMedium,
    paddingTop: SPACING.md,
  },
  priceOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  priceOptionsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  addPriceButton: {
    padding: SPACING.xs,
  },
  noPricesText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  priceOptionsList: {
    gap: SPACING.sm,
  },
  priceOptionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  priceOptionInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  priceOptionSize: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flexShrink: 0,
  },
  priceOptionPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: "bold",
    color: COLORS.success,
    flexShrink: 0,
  },
  priceOptionStock: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  priceOptionActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  smallActionButton: {
    padding: SPACING.xs,
  },
  addButton: {
    position: "absolute",
    bottom: SPACING.xxl,
    right: SPACING.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.fab,
  },
  imageSection: {
    marginBottom: SPACING.lg,
  },
  imageLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  imagePicker: {
    width: "100%",
    height: 150,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.border,
  },
  imagePickerText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
});
