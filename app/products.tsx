import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
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
  { label: "Vocni Med", value: "Vocni Med" },
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
      Alert.alert("Greska", "Potrebna je dozvola za pristup galeriji");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        Alert.alert("Greska", "Nije moguce otpremiti sliku");
      }
      setImageUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.product_name.trim()) {
      Alert.alert("Greska", "Naziv proizvoda je obavezan");
      return;
    }

    if (editingProduct) {
      const success = await updateProduct(editingProduct.id, formData);
      if (!success) {
        Alert.alert("Greska", "Nije moguce azurirati proizvod");
        return;
      }
    } else {
      const newProduct = await addProduct(formData);
      if (!newProduct) {
        Alert.alert("Greska", "Nije moguce dodati proizvod");
        return;
      }
    }

    setModalVisible(false);
    resetForm();
  };

  const handleDeleteProduct = (product: ProductWithOptions) => {
    Alert.alert(
      "Obrisi Proizvod",
      `Da li ste sigurni da zelite da obrisete "${product.product_name}"? Ovo ce obrisati i sve opcije cena.`,
      [
        { text: "Otkazi", style: "cancel" },
        {
          text: "Obrisi",
          style: "destructive",
          onPress: async () => {
            const success = await deleteProduct(product.id);
            if (!success) {
              Alert.alert("Greska", "Nije moguce obrisati proizvod");
            }
          },
        },
      ]
    );
  };

  const handleSavePriceOption = async () => {
    if (!selectedProductId) return;

    if (!priceFormData.size.trim() || !priceFormData.price.trim()) {
      Alert.alert("Greska", "Velicina i cena su obavezni");
      return;
    }

    const optionData = {
      product_id: selectedProductId,
      size: priceFormData.size,
      price: priceFormData.price,
      stock: parseInt(priceFormData.stock) || 0,
    };

    if (editingPriceOption) {
      const success = await updatePriceOption(editingPriceOption.id, optionData);
      if (!success) {
        Alert.alert("Greska", "Nije moguce azurirati opciju cene");
        return;
      }
    } else {
      const newOption = await addPriceOption(optionData);
      if (!newOption) {
        Alert.alert("Greska", "Nije moguce dodati opciju cene");
        return;
      }
    }

    setPriceModalVisible(false);
    resetPriceForm();
  };

  const handleDeletePriceOption = (option: ProductPriceOption) => {
    Alert.alert(
      "Obrisi Opciju Cene",
      `Da li ste sigurni da zelite da obrisete "${option.size}"?`,
      [
        { text: "Otkazi", style: "cancel" },
        {
          text: "Obrisi",
          style: "destructive",
          onPress: async () => {
            const success = await deletePriceOption(option.id);
            if (!success) {
              Alert.alert("Greska", "Nije moguce obrisati opciju cene");
            }
          },
        },
      ]
    );
  };

  const getPriceRange = (options: ProductPriceOption[]): string => {
    if (options.length === 0) return "Nema cena";

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
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="settings-outline" size={64} color={COLORS.primary} />
        <Text style={styles.configTitle}>Supabase nije konfigurisan</Text>
        <Text style={styles.configText}>
          Otvorite utils/supabase.ts i dodajte vase Supabase kredencijale:{"\n\n"}
          - SUPABASE_URL{"\n"}
          - SUPABASE_ANON_KEY{"\n"}
          - STORAGE_BUCKET
        </Text>
      </View>
    );
  }

  if (productsError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>{productsError}</Text>
        <Button title="Pokusaj ponovo" onPress={fetchProducts} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Proizvoda</Text>
            <Text style={styles.summaryValue}>{products.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ukupno na stanju</Text>
            <Text style={styles.summaryValue}>
              {products.reduce((sum, p) => sum + getTotalStock(p.price_options), 0)}
            </Text>
          </View>
        </View>
      </Card>

      <LowStockAlert products={products} threshold={5} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {products.length === 0 ? (
          <EmptyState
            icon="pricetag-outline"
            title="Nema proizvoda"
            message="Dodajte prvi proizvod da biste zapoceli"
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
                    <Text style={styles.productName}>{product.product_name}</Text>
                    {product.type && (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{product.type}</Text>
                      </View>
                    )}
                    <Text style={styles.priceRange}>
                      {getPriceRange(product.price_options)}
                    </Text>
                    <Text style={styles.stockText}>
                      Na stanju: {getTotalStock(product.price_options)}
                    </Text>
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
                  <Text style={styles.productDesc} numberOfLines={2}>
                    {product.desc}
                  </Text>
                )}

                {/* Price Options */}
                <View style={styles.priceOptionsSection}>
                  <View style={styles.priceOptionsHeader}>
                    <Text style={styles.priceOptionsTitle}>Opcije cena</Text>
                    <TouchableOpacity
                      onPress={() => openAddPriceModal(product.id)}
                      style={styles.addPriceButton}
                    >
                      <Ionicons name="add-circle" size={24} color={COLORS.success} />
                    </TouchableOpacity>
                  </View>

                  {product.price_options.length === 0 ? (
                    <Text style={styles.noPricesText}>Nema opcija cena</Text>
                  ) : (
                    <View style={styles.priceOptionsList}>
                      {product.price_options.map((option) => (
                        <View key={option.id} style={styles.priceOptionItem}>
                          <View style={styles.priceOptionInfo}>
                            <Text style={styles.priceOptionSize}>{option.size}</Text>
                            <Text style={styles.priceOptionPrice}>
                              {parseFloat(option.price).toLocaleString("sr-RS")} KM
                            </Text>
                            <Text style={styles.priceOptionStock}>
                              Stanje: {option.stock}
                            </Text>
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
        title={editingProduct ? "Izmeni Proizvod" : "Novi Proizvod"}
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
          <Text style={styles.imageLabel}>Slika proizvoda</Text>
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
                <Text style={styles.imagePickerText}>Izaberi sliku</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Input
          label="Alt tekst (za pristupacnost)"
          value={formData.alt}
          onChangeText={(text) => setFormData({ ...formData, alt: text })}
          placeholder="Opis slike..."
        />

        <View style={styles.modalButtons}>
          <Button
            title="Otkazi"
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title={editingProduct ? "Sacuvaj" : "Dodaj"}
            onPress={handleSaveProduct}
            style={{ flex: 1, marginLeft: SPACING.sm }}
            disabled={imageUploading}
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
        title={editingPriceOption ? "Izmeni Opciju Cene" : "Nova Opcija Cene"}
      >
        <Input
          label="Velicina/Pakovanje *"
          value={priceFormData.size}
          onChangeText={(text) => setPriceFormData({ ...priceFormData, size: text })}
          placeholder="Npr. 1kg, 500g, 250ml..."
        />

        <Input
          label="Cena (KM) *"
          value={priceFormData.price}
          onChangeText={(text) => setPriceFormData({ ...priceFormData, price: text })}
          placeholder="Npr. 15.00"
          keyboardType="decimal-pad"
        />

        <Input
          label="Kolicina na stanju"
          value={priceFormData.stock}
          onChangeText={(text) => setPriceFormData({ ...priceFormData, stock: text })}
          placeholder="0"
          keyboardType="number-pad"
        />

        <View style={styles.modalButtons}>
          <Button
            title="Otkazi"
            onPress={() => {
              setPriceModalVisible(false);
              resetPriceForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title={editingPriceOption ? "Sacuvaj" : "Dodaj"}
            onPress={handleSavePriceOption}
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
    paddingVertical: 2,
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
    minWidth: 60,
  },
  priceOptionPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: "bold",
    color: COLORS.success,
    minWidth: 80,
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
