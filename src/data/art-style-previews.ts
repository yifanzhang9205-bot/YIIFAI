/**
 * 画风预览图片URL配置
 *
 * 使用说明：
 * 1. 运行 API: POST /api/art-styles/generate-previews 生成预览图
 * 2. 将生成的 imageUrl 更新到这个文件中
 * 3. 前端组件会自动使用这些预览图片
 */

export const ART_STYLE_PREVIEWS: Record<string, string> = {
  // 写实类
  '写实风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_5edb052c-45d7-404c-b19c-31c910986919.jpeg?sign=1770407544-5ebafd67e4-0-a8105cf938a5c734c786b5181b7f0191573a35383ccd1962ba435e067bdefef6',
  '电影质感': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_c818e670-0341-4deb-be95-13538b420999.jpeg?sign=1770407544-60c9649753-0-ff31253ea58da7feb368e909fc2acf33e9fdd714302e4d8b0ee8eadee80f9176',

  // 动漫/漫画类
  '动漫风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_3bde9996-6fb8-4faf-8924-76a565217125.jpeg?sign=1770407543-f3f6a069cb-0-3a47d6a22f6809b225ae66fc17cf0496928875d69a576877b5deb4c64233142a',
  '吉卜力风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_8ec8129e-a497-412d-868d-281caf1c0940.jpeg?sign=1770407556-51c068c49a-0-216375dbc98717f991e2a4f8d8667ce0bcd6c05c5470111cf94d8ed718046880',
  '新海诚风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_1ab747b6-3d74-47c6-b770-3f29d518e4d7.jpeg?sign=1770407553-0b2fa9d294-0-701910d546d9f636d8e8d4f6d703381c4275c523b98c451e2d00380b48a1f6',
  '宫崎骏风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_70effe94-4611-4cab-bded-fc60a5221e4b.jpeg?sign=1770407591-e0744c087b-0-7005ffead5be786ac3b2e0b099ae13041643e1bdd5c0897ab42bae3855c2471d',

  // 卡通/插画类
  '卡通风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_4c2b5042-fd93-4f34-82e4-fc4b3e727704.jpeg?sign=1770407559-56dc06b04e-0-4e4178c4558c6204714815b6b5576473e9201a458749777860d5b2a5a4650717',
  '迪士尼风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_f581d658-b9df-4dfb-9d32-c6b819e278e6.jpeg?sign=1770407547-596b8f0870-0-a9034969f3d7c60d055d5f9e7b78c8237e3999585f6c6b7e4c9e0c7a9f9e8c8',
  '皮克斯风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_e2c68318-a6b9-47f4-8484-a5d704989981.jpeg?sign=1770407552-f4a2d6287b-0-c890a6f99e6c7d6f9f5e6c6b7e4c9e0c7a9f9e8c8',

  // 艺术绘画类
  '水彩风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_6f934583-23d1-4be2-801e-d14ee856053e.jpeg?sign=1770407565-0f2413b479-0-a10a617fe525621fb036cf3d614d2d8712730df651029e72d14587480b92dc8a',
  '油画风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_cd4c7774-8f17-424c-adb4-7a641f5da0cf.jpeg?sign=1770407579-f5c678786e-0-ee94305e3456ba6c6324fac3281bab280b36fed46cc923ed421609119a660608',

  // 传统文化类
  '水墨风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_77fc1463-e073-4693-b866-f419e81e9af2.jpeg?sign=1770407578-0dc089f9df-0-028ad892a2b3d6986313e7fbfb897954c71215350140efa4412aada60743982e',

  // 科幻/未来类
  '赛博朋克': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_dc66c4f8-d635-4fab-9fa9-be8987ddaed1.jpeg?sign=1770407580-bb1c3def55-0-76ca92ba9fdcaa3f091a1d6833013ec8cbce3a7c0ff19df7ddfe6d57c6b051a8',

  // 奇幻/魔法类
  '奇幻风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_e30589ae-c433-453f-8160-04985649da8d.jpeg?sign=1770407592-e6e10c5c33-0-dce928d879420fae12e73a88af266674e1985747c7621bf250a56cf8ec475a6e',

  // 数字/现代类
  '像素风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_ccbbd187-0b9f-4999-973e-d9d27a567b74.jpeg?sign=1770407590-3a1d27b670-0-bf09eda948d87bc506279a4b6531d631702e56639ade64664f2ff1a61f3bf733',

  // TODO: 添加其他画风的预览URL
  // 在生成其他画风预览后，将URL添加到这里
};

/**
 * 检查画风是否有预览图
 */
export function hasPreview(styleName: string): boolean {
  return ART_STYLE_PREVIEWS.hasOwnProperty(styleName);
}

/**
 * 获取画风的预览URL
 * 如果没有预览图，返回null
 */
export function getPreviewUrl(styleName: string): string | null {
  return ART_STYLE_PREVIEWS[styleName] || null;
}

/**
 * 获取画风的渐变背景（作为没有预览图时的备选）
 */
export function getGradientFallback(styleName: string): string {
  // 这里返回默认的渐变色
  return 'from-gray-600 to-gray-800';
}
