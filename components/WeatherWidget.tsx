import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AppText from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/designTokens';

const LATITUDE = 44.7866;
const LONGITUDE = 20.4489;
const LOCATION_NAME = 'Pčelinjak';

const CARD_BG = '#0D3B6E';

type ActivityLevel = 1 | 2 | 3;

interface FlightActivity {
  label: string;
  level: ActivityLevel;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  humidity: number;
  windSpeed: number;
  activity: FlightActivity;
}

const getWeatherIcon = (code: number): keyof typeof Ionicons.glyphMap => {
  if (code === 0) return 'sunny';
  if (code <= 3) return 'partly-sunny';
  if (code <= 48) return 'cloud';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rainy';
  if (code <= 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'cloud';
};

const getWeatherDescription = (code: number): string => {
  if (code === 0) return 'Vedro';
  if (code <= 3) return 'Djelimično oblačno';
  if (code <= 48) return 'Oblačno';
  if (code <= 55) return 'Kiša';
  if (code <= 67) return 'Kiša sa snijegom';
  if (code <= 77) return 'Snijeg';
  if (code <= 82) return 'Pljusak';
  if (code <= 86) return 'Snijeg';
  if (code >= 95) return 'Grmljavina';
  return 'Nepoznato';
};

const getFlightActivity = (
  code: number,
  temp: number,
  wind: number,
  humidity: number
): FlightActivity => {
  if (code >= 45 || temp < 8 || wind > 30)
    return { label: 'Niska', level: 1 };
  if (code >= 3 || temp < 14 || wind > 20 || humidity > 88)
    return { label: 'Srednja', level: 2 };
  return { label: 'Visoka', level: 3 };
};

function ActivityBars({ level }: { level: ActivityLevel }) {
  return (
    <View style={styles.bars}>
      {([8, 13, 18] as const).map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: h,
              backgroundColor:
                i < level ? COLORS.primary : 'rgba(255,255,255,0.22)',
            },
          ]}
        />
      ))}
    </View>
  );
}

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
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const c = data.current;
      const code = c.weather_code;
      const temp = Math.round(c.temperature_2m);
      const humidity = c.relative_humidity_2m;
      const windSpeed = Math.round(c.wind_speed_10m);
      setWeather({
        temp,
        description: getWeatherDescription(code),
        icon: getWeatherIcon(code),
        humidity,
        windSpeed,
        activity: getFlightActivity(code, temp, windSpeed, humidity),
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) return null;

  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  if (!weather) return null;

  return (
    <View style={styles.card}>
      {/* ── Top row: labels + weather icon ── */}
      <View style={styles.topRow}>
        <View>
          <AppText style={styles.eyebrow} maxFontSizeMultiplier={1}>TRENUTNO VRIJEME</AppText>
          <AppText style={styles.locationText}>{LOCATION_NAME}</AppText>
        </View>
        <Ionicons
          name={weather.icon}
          size={56}
          color="rgba(255,255,255,0.88)"
        />
      </View>

      {/* ── Bottom row: temp + flight activity ── */}
      <View style={styles.bottomRow}>
        <View>
          <AppText style={styles.tempText} maxFontSizeMultiplier={1.2}>{weather.temp}°C</AppText>
          <AppText style={styles.detailText}>{`Vlažnost: ${weather.humidity}%`}</AppText>
          <AppText style={styles.detailText}>{`Vjetar: ${weather.windSpeed} km/h`}</AppText>
        </View>

        <View style={styles.activityBox}>
          <AppText style={styles.activityEyebrow} maxFontSizeMultiplier={1}>AKTIVNOST LETA</AppText>
          <ActivityBars level={weather.activity.level} />
          <AppText style={styles.activityLabel}>{weather.activity.label}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  loadingCard: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Top row ──────────────────────────────
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.3,
    marginBottom: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#ffffff',
  },

  // ── Bottom row ───────────────────────────
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tempText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 44,
    marginBottom: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },

  // ── Flight Activity box ───────────────────
  activityBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minWidth: 112,
  },
  activityEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginBottom: SPACING.sm,
  },
  bar: {
    width: 9,
    borderRadius: 3,
  },
  activityLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#ffffff',
  },
});
