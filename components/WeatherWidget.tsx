import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants/designTokens';

interface WeatherData {
  temp: number;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  humidity: number;
  windSpeed: number;
}

// Using Open-Meteo free API (no key required)
const LATITUDE = 44.7866; // Default: Belgrade area
const LONGITUDE = 20.4489;

const getWeatherIcon = (weatherCode: number): keyof typeof Ionicons.glyphMap => {
  if (weatherCode === 0) return 'sunny';
  if (weatherCode <= 3) return 'partly-sunny';
  if (weatherCode <= 48) return 'cloud';
  if (weatherCode <= 67) return 'rainy';
  if (weatherCode <= 77) return 'snow';
  if (weatherCode <= 82) return 'rainy';
  if (weatherCode <= 86) return 'snow';
  if (weatherCode >= 95) return 'thunderstorm';
  return 'cloud';
};

const getWeatherDescription = (weatherCode: number): string => {
  if (weatherCode === 0) return 'Vedro';
  if (weatherCode <= 3) return 'Delimično oblačno';
  if (weatherCode <= 48) return 'Oblačno';
  if (weatherCode <= 55) return 'Kiša';
  if (weatherCode <= 67) return 'Kiša sa snegom';
  if (weatherCode <= 77) return 'Sneg';
  if (weatherCode <= 82) return 'Pljusak';
  if (weatherCode <= 86) return 'Sneg';
  if (weatherCode >= 95) return 'Grmljavina';
  return 'Nepoznato';
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(false);

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );

      if (!response.ok) throw new Error('Weather fetch failed');

      const data = await response.json();
      const current = data.current;

      setWeather({
        temp: Math.round(current.temperature_2m),
        description: getWeatherDescription(current.weather_code),
        icon: getWeatherIcon(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) return null; // Silently hide on error
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }
  if (!weather) return null;

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <Ionicons name={weather.icon} size={28} color={COLORS.primary} />
        <Text style={styles.temp}>{weather.temp}°C</Text>
        <Text style={styles.description}>{weather.description}</Text>
      </View>
      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Ionicons name="water" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{weather.humidity}%</Text>
        </View>
        <View style={styles.detail}>
          <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{weather.windSpeed} km/h</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    ...SHADOW.sm,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  temp: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
});
