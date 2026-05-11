/* TaxTracker — AntD 5 ConfigProvider theme (Quiet Premium) */

import { theme as antdTheme } from 'antd';

const fontFamily =
  '"Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const fontFamilyCode =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

const sharedToken = {
  fontFamily,
  fontFamilyCode,
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,
  fontSizeHeading1: 36,
  fontSizeHeading2: 28,
  fontSizeHeading3: 22,
  fontSizeHeading4: 18,
  fontSizeHeading5: 16,

  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  borderRadiusXS: 4,

  controlHeight: 34,
  controlHeightLG: 38,
  controlHeightSM: 28,

  motionDurationFast: '0.12s',
  motionDurationMid: '0.16s',
  motionDurationSlow: '0.20s',
  motionEaseInOut: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
  motionEaseOut: 'cubic-bezier(0.16, 1, 0.3, 1)',

  lineHeight: 1.45,
  lineHeightLG: 1.4,
  lineHeightSM: 1.5,

  wireframe: false,
};

export const lightTheme = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedToken,

    colorPrimary: '#1f3fe5',
    colorPrimaryHover: '#1832b8',
    colorPrimaryActive: '#142a93',
    colorPrimaryBg: '#eef1ff',
    colorPrimaryBgHover: '#dbe2ff',
    colorPrimaryBorder: '#b8c4ff',
    colorPrimaryBorderHover: '#8a9bff',
    colorPrimaryText: '#1832b8',
    colorPrimaryTextHover: '#122677',

    colorSuccess: '#2f7d5b',
    colorSuccessBg: '#e6f4ec',
    colorSuccessBorder: '#bfe0cf',
    colorError: '#c0394a',
    colorErrorBg: '#fbeaec',
    colorErrorBorder: '#f0c5cc',
    colorWarning: '#b07a1a',
    colorWarningBg: '#fcf2dd',
    colorWarningBorder: '#ecd9a8',
    colorInfo: '#1f3fe5',
    colorInfoBg: '#eef1ff',
    colorInfoBorder: '#b8c4ff',

    colorBgBase: '#f5f6f9',
    colorBgLayout: '#f5f6f9',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#262d3c',

    colorText: '#161a26',
    colorTextSecondary: '#5a6275',
    colorTextTertiary: '#7c8597',
    colorTextQuaternary: '#a8b0bf',
    colorTextDescription: '#5a6275',

    colorBorder: 'rgba(20, 26, 40, 0.10)',
    colorBorderSecondary: 'rgba(20, 26, 40, 0.06)',
    colorSplit: 'rgba(20, 26, 40, 0.06)',

    colorFill: 'rgba(20, 26, 40, 0.06)',
    colorFillSecondary: 'rgba(20, 26, 40, 0.04)',
    colorFillTertiary: 'rgba(20, 26, 40, 0.02)',
    colorFillQuaternary: 'rgba(20, 26, 40, 0.015)',

    boxShadow:
      '0 1px 2px rgba(15,20,35,0.04), 0 1px 1px rgba(15,20,35,0.03)',
    boxShadowSecondary:
      '0 6px 16px rgba(15,20,35,0.06), 0 2px 4px rgba(15,20,35,0.04)',
    boxShadowTertiary: '0 1px 2px rgba(15,20,35,0.04)',
  },

  components: {
    Layout: {
      headerBg: '#f5f6f9',
      headerHeight: 64,
      headerPadding: '0 32px',
      bodyBg: '#f5f6f9',
      siderBg: '#ffffff',
      triggerBg: '#ffffff',
      triggerColor: '#5a6275',
    },

    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#eef1ff',
      itemSelectedColor: '#1832b8',
      itemHoverBg: '#f0f2f6',
      itemHoverColor: '#161a26',
      itemActiveBg: '#eef1ff',
      itemHeight: 38,
      itemPaddingInline: 12,
      itemMarginInline: 0,
      itemBorderRadius: 8,
      iconSize: 16,
      collapsedIconSize: 18,
      subMenuItemBg: 'transparent',
    },

    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
      headerBg: 'transparent',
      headerFontSize: 14,
      headerFontSizeSM: 13,
      colorBorderSecondary: 'rgba(20, 26, 40, 0.06)',
      boxShadowTertiary: '0 1px 2px rgba(15,20,35,0.04)',
    },

    Button: {
      borderRadius: 8,
      controlHeight: 34,
      controlHeightLG: 38,
      controlHeightSM: 28,
      fontWeight: 500,
      primaryShadow: '0 1px 2px rgba(31,63,229,0.25)',
      defaultBg: '#ffffff',
      defaultBorderColor: 'rgba(20, 26, 40, 0.10)',
      defaultColor: '#5a6275',
      defaultHoverBg: '#f7f8fa',
      defaultHoverBorderColor: 'rgba(20, 26, 40, 0.16)',
      defaultHoverColor: '#161a26',
      paddingInline: 14,
      textHoverBg: '#f0f2f6',
    },

    Input: {
      controlHeight: 34,
      controlHeightLG: 38,
      borderRadius: 8,
      paddingBlock: 8,
      paddingInline: 12,
      activeBorderColor: '#1f3fe5',
      hoverBorderColor: '#8a9bff',
      activeShadow: '0 0 0 3px rgba(31,63,229,0.12)',
      colorBgContainer: '#ffffff',
      colorTextPlaceholder: '#a8b0bf',
    },

    InputNumber: {
      controlHeight: 34,
      borderRadius: 8,
      activeBorderColor: '#1f3fe5',
      activeShadow: '0 0 0 3px rgba(31,63,229,0.12)',
    },

    Select: {
      controlHeight: 34,
      controlHeightLG: 38,
      borderRadius: 8,
      optionSelectedBg: '#eef1ff',
      optionSelectedColor: '#1832b8',
      optionActiveBg: '#f0f2f6',
      optionFontSize: 13,
      colorBgElevated: '#ffffff',
    },

    DatePicker: {
      controlHeight: 34,
      borderRadius: 8,
      activeBorderColor: '#1f3fe5',
      activeShadow: '0 0 0 3px rgba(31,63,229,0.12)',
      cellActiveWithRangeBg: '#eef1ff',
      cellHoverBg: '#f0f2f6',
    },

    Table: {
      borderRadius: 12,
      borderRadiusLG: 12,
      headerBg: '#eef0f4',
      headerColor: '#7c8597',
      headerSortHoverBg: '#e4e7ee',
      headerSortActiveBg: '#e4e7ee',
      headerSplitColor: 'transparent',
      rowHoverBg: '#f7f8fa',
      rowSelectedBg: '#eef1ff',
      rowSelectedHoverBg: '#dbe2ff',
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
      cellFontSize: 13,
      cellFontSizeMD: 13,
      footerBg: '#eef0f4',
      footerColor: '#161a26',
      borderColor: 'rgba(20, 26, 40, 0.06)',
    },

    Statistic: {
      titleFontSize: 11,
      contentFontSize: 28,
      fontFamily: fontFamilyCode,
    },

    Tag: {
      borderRadiusSM: 999,
      defaultBg: '#f0f2f6',
      defaultColor: '#5a6275',
      fontSize: 11.5,
      lineHeight: 1.5,
    },

    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#161a26',
      itemHoverBg: 'transparent',
      itemHoverColor: '#161a26',
      itemColor: '#5a6275',
      trackBg: '#eef0f4',
      trackPadding: 3,
      borderRadius: 8,
      borderRadiusSM: 6,
    },

    Tabs: {
      itemColor: '#7c8597',
      itemSelectedColor: '#1f3fe5',
      itemHoverColor: '#161a26',
      itemActiveColor: '#1832b8',
      inkBarColor: '#1f3fe5',
      titleFontSize: 13,
      horizontalItemPadding: '10px 4px',
    },

    Modal: {
      borderRadiusLG: 16,
      headerBg: '#ffffff',
      contentBg: '#ffffff',
      titleFontSize: 18,
      paddingContentHorizontalLG: 28,
    },

    Tooltip: {
      colorBgSpotlight: '#262d3c',
      borderRadius: 8,
      paddingXS: 8,
      fontSize: 12,
    },

    Form: {
      labelColor: '#5a6275',
      labelFontSize: 12,
      labelHeight: 20,
      itemMarginBottom: 16,
      verticalLabelPadding: '0 0 6px',
    },

    Checkbox: {
      borderRadiusSM: 4,
      controlInteractiveSize: 16,
      colorPrimary: '#1f3fe5',
    },

    Radio: {
      buttonBg: '#ffffff',
      buttonCheckedBg: '#1f3fe5',
      buttonColor: '#5a6275',
      colorPrimary: '#1f3fe5',
    },

    Divider: {
      colorSplit: 'rgba(20, 26, 40, 0.06)',
    },

    Dropdown: {
      borderRadiusLG: 12,
      paddingBlock: 6,
    },

    Pagination: {
      itemActiveBg: '#1f3fe5',
      itemActiveColorDisabled: '#a8b0bf',
      itemSize: 30,
      borderRadius: 8,
    },

    Alert: {
      borderRadiusLG: 8,
      colorInfoBg: '#eef1ff',
      colorInfoBorder: 'rgba(31,63,229,0.18)',
    },
  },
};

export const darkTheme = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedToken,

    colorPrimary: '#5c6eff',
    colorPrimaryHover: '#8a9bff',
    colorPrimaryActive: '#3a4fef',
    colorPrimaryBg: 'rgba(92,110,255,0.12)',
    colorPrimaryBgHover: 'rgba(92,110,255,0.18)',
    colorPrimaryBorder: 'rgba(92,110,255,0.32)',
    colorPrimaryBorderHover: 'rgba(92,110,255,0.50)',
    colorPrimaryText: '#a8b4ff',
    colorPrimaryTextHover: '#dbe2ff',

    colorSuccess: '#4ea784',
    colorSuccessBg: 'rgba(78,167,132,0.12)',
    colorSuccessBorder: 'rgba(78,167,132,0.30)',
    colorError: '#e26477',
    colorErrorBg: 'rgba(226,100,119,0.12)',
    colorErrorBorder: 'rgba(226,100,119,0.30)',
    colorWarning: '#d4a04a',
    colorWarningBg: 'rgba(212,160,74,0.12)',
    colorWarningBorder: 'rgba(212,160,74,0.30)',
    colorInfo: '#5c6eff',

    colorBgBase: '#0a0d14',
    colorBgLayout: '#0a0d14',
    colorBgContainer: '#11151f',
    colorBgElevated: '#161b27',
    colorBgSpotlight: '#1a1f2c',

    colorText: '#e8ebf2',
    colorTextSecondary: '#a8b0bf',
    colorTextTertiary: '#7c8597',
    colorTextQuaternary: '#5a6275',
    colorTextDescription: '#a8b0bf',

    colorBorder: 'rgba(255,255,255,0.08)',
    colorBorderSecondary: 'rgba(255,255,255,0.04)',
    colorSplit: 'rgba(255,255,255,0.04)',

    colorFill: 'rgba(255,255,255,0.06)',
    colorFillSecondary: 'rgba(255,255,255,0.04)',
    colorFillTertiary: 'rgba(255,255,255,0.02)',
    colorFillQuaternary: 'rgba(255,255,255,0.015)',

    boxShadow: '0 0 0 1px rgba(255,255,255,0.03)',
    boxShadowSecondary:
      '0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',
    boxShadowTertiary: '0 0 0 1px rgba(255,255,255,0.03)',
  },

  components: {
    Layout: {
      headerBg: '#0a0d14',
      headerHeight: 64,
      headerPadding: '0 32px',
      bodyBg: '#0a0d14',
      siderBg: '#11151f',
      triggerBg: '#11151f',
      triggerColor: '#a8b0bf',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(92,110,255,0.10)',
      itemSelectedColor: '#b8c4ff',
      itemHoverBg: 'rgba(255,255,255,0.04)',
      itemHoverColor: '#e8ebf2',
      itemHeight: 38,
      itemPaddingInline: 12,
      itemBorderRadius: 8,
      iconSize: 16,
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
      colorBorderSecondary: 'rgba(255,255,255,0.06)',
      headerBg: 'transparent',
      headerFontSize: 14,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 34,
      controlHeightLG: 38,
      fontWeight: 500,
      defaultBg: '#11151f',
      defaultBorderColor: 'rgba(255,255,255,0.10)',
      defaultColor: '#a8b0bf',
      defaultHoverBg: '#161b27',
      defaultHoverBorderColor: 'rgba(255,255,255,0.16)',
      defaultHoverColor: '#e8ebf2',
      primaryShadow: '0 1px 2px rgba(92,110,255,0.30)',
    },
    Input: {
      controlHeight: 34,
      borderRadius: 8,
      activeBorderColor: '#5c6eff',
      activeShadow: '0 0 0 3px rgba(92,110,255,0.18)',
      colorBgContainer: '#0e1119',
      colorTextPlaceholder: '#5a6275',
    },
    Select: {
      controlHeight: 34,
      borderRadius: 8,
      optionSelectedBg: 'rgba(92,110,255,0.12)',
      optionActiveBg: 'rgba(255,255,255,0.04)',
      colorBgElevated: '#161b27',
    },
    DatePicker: {
      controlHeight: 34,
      borderRadius: 8,
      activeBorderColor: '#5c6eff',
      activeShadow: '0 0 0 3px rgba(92,110,255,0.18)',
      cellHoverBg: 'rgba(255,255,255,0.04)',
      cellActiveWithRangeBg: 'rgba(92,110,255,0.10)',
    },
    Table: {
      borderRadius: 12,
      headerBg: '#0e1119',
      headerColor: '#7c8597',
      rowHoverBg: 'rgba(255,255,255,0.03)',
      rowSelectedBg: 'rgba(92,110,255,0.08)',
      rowSelectedHoverBg: 'rgba(92,110,255,0.12)',
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
      cellFontSize: 13,
      footerBg: '#0e1119',
      footerColor: '#e8ebf2',
      borderColor: 'rgba(255,255,255,0.06)',
    },
    Statistic: {
      titleFontSize: 11,
      contentFontSize: 28,
      fontFamily: fontFamilyCode,
    },
    Tag: {
      borderRadiusSM: 999,
      defaultBg: 'rgba(255,255,255,0.06)',
      defaultColor: '#a8b0bf',
      fontSize: 11.5,
    },
    Segmented: {
      itemSelectedBg: '#1a1f2c',
      itemSelectedColor: '#e8ebf2',
      itemColor: '#a8b0bf',
      trackBg: '#0e1119',
      borderRadius: 8,
    },
    Tooltip: {
      colorBgSpotlight: '#1a1f2c',
      borderRadius: 8,
    },
    Form: {
      labelColor: '#a8b0bf',
      labelFontSize: 12,
      itemMarginBottom: 16,
    },
    Modal: {
      contentBg: '#161b27',
      headerBg: '#161b27',
      borderRadiusLG: 16,
    },
  },
};

export function getTheme(mode) {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export default lightTheme;
