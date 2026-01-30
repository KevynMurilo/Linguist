package com.linguist.core.lesson;

import java.util.Map;

public final class LanguageNameMapper {

    private LanguageNameMapper() {}

    private static final Map<String, String> LANGUAGE_NAMES = Map.ofEntries(
            Map.entry("en-US", "English (United States)"),
            Map.entry("en-GB", "English (United Kingdom)"),
            Map.entry("es-ES", "Spanish (Spain)"),
            Map.entry("es-MX", "Spanish (Mexico)"),
            Map.entry("pt-BR", "Portuguese (Brazil)"),
            Map.entry("pt-PT", "Portuguese (Portugal)"),
            Map.entry("fr-FR", "French"),
            Map.entry("de-DE", "German"),
            Map.entry("it-IT", "Italian"),
            Map.entry("ja-JP", "Japanese"),
            Map.entry("ko-KR", "Korean"),
            Map.entry("zh-CN", "Chinese (Simplified)")
    );

    public static String getFullName(String code) {
        return LANGUAGE_NAMES.getOrDefault(code, code);
    }
}
