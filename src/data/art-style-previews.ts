/**
 * 画风预览图片URL配置
 *
 * 使用说明：
 * 1. 运行 API: POST /api/art-styles/generate-previews 生成预览图
 * 2. 将生成的 imageUrl 更新到这个文件中
 * 3. 前端组件会自动使用这些预览图片
 */

export const ART_STYLE_PREVIEWS: Record<string, string> = {
  '写实风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_1e7aa2d0-8093-456b-8fee-b95a612a76d3.jpeg?sign=1770407762-f04fd73a54-0-b0185aafd4612429c99675d909b7fa10033c779146b5d317b54e50d1d222f328',
  '电影质感': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_8927daeb-d9c8-426d-b27e-0b8171a1e68a.jpeg?sign=1770407761-044e7f7863-0-89d2fdf157b0519e1549e59d45bb8348e845c4c2a562bd1f6956376c7e1e821b',
  '纪录片风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_b6dbf594-f6c2-465e-8f69-a5ba34196eda.jpeg?sign=1770407761-95cc5fc0ee-0-ba171c9d21e2e821f6a7918106abf863d52d819a874049c331d402ef2d89e010',
  '新闻摄影': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_eec092c9-ff9b-4469-8e26-109d9714fb05.jpeg?sign=1770407773-08f67db8ab-0-f5560c8da269638a95e66d0711fc7fae056dcfc4abd4daa2bfa9dff9ab72d98b',
  '商业摄影': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_d98c93ab-9f96-4a6c-8298-fa0984ddddf7.jpeg?sign=1770407771-727116ff72-0-be13315066ff42a17f20b15f8692b017dbb6a052fa31915e372e40ab0334b958',
  '动漫风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_7a5bb9a4-a819-4913-976a-45b49d961301.jpeg?sign=1770407772-154b84394b-0-ce32de8e5614e2662c9d17d8410bf6dd6a83ef141e95665929d8838732d462b3',
  '漫画风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_069d2e8d-9ccc-4e78-a870-2feab550a1ff.jpeg?sign=1770407783-39cfe410ee-0-83922eaad27dcb924adc7ff0f3971371ae3e866bf781c27e16b2a54978e2e904',
  '赛璐璐风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_6d5f7c18-8683-48e6-ac98-496b21d2efa9.jpeg?sign=1770407783-7136cbca12-0-e3b0451dd47a868605dd8400f92941e6c221248790511807d5eb138f8187487f',
  '吉卜力风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_4b258795-f222-4bd5-ad7d-05ff9865abde.jpeg?sign=1770407783-1a3dfc904c-0-dbc790fe220643e63cb0f73689ff0dd7856ef1bd281e6e57ef5d0da6b79222c2',
  '新海诚风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_42843d73-7738-418c-8491-4907bc49d07f.jpeg?sign=1770407794-4e84f443d5-0-36902b820b4e1f4fcf82bb6626d1bf6633d26df59dcf238cdfab2d0c8a94f895',
  '宫崎骏风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_554ae23e-c85a-40db-8997-b7a4f0efd796.jpeg?sign=1770407794-e0c799c53c-0-85c69578e2bfedc174006e2e1bb0e8254088e2e2fdbf75811638fa24dd454db3',
  '卡通风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_2e87ac15-d427-42d9-b4c3-f45651d0e6aa.jpeg?sign=1770407794-d6749b599c-0-c549de51f3ec4992249dcd3623b82bedf415adafb2754910a65cb9de2d03149f',
  '迪士尼风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_28a62572-6437-4a01-9fee-7539c12051ac.jpeg?sign=1770407806-fb77fed683-0-eace97eb3d2cee0986785423319cc1fdaff38143778e18d570de22f1e57c36d6',
  '皮克斯风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_c36175ae-f57a-4d22-ad8d-efa956793c85.jpeg?sign=1770407805-b8112552ef-0-04556fe08b9eece2fd2e24162ba0a9e503b6db8cf061c6884a38a46e22d4f3b2',
  '儿童绘本': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_5e4eb277-9fd7-4687-a65f-5331cb1f959e.jpeg?sign=1770407804-8a21b94393-0-f6c5c3ee661dda4e28b3ae1660efdf1edef5e0a55764d6cccf989d1231a7fcf6',
  '矢量插画': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_680322f2-8241-4398-a6c4-a5169e05e9ec.jpeg?sign=1770407816-9bdcfe558b-0-06b9144cb92ab0772f1e197a39b3d4efcea3f53d400e6566e0960087ee876bee',
  '涂鸦风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_895f58c6-7f80-4ece-8438-70ae5188e4f2.jpeg?sign=1770407817-d1c09280b4-0-b129dc70ed980a3533018301109d3bb335f5e099c1dcddbc812dc61ce3eff15a',
  '水彩风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_53dfa7af-3ba2-4f06-8987-b8db0b5b0862.jpeg?sign=1770407816-7e6463cfb0-0-299a877bfd75654ef6ab6b4613f3697d7775423d5bc2d4f69e3819e9ba9d650f',
  '油画风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_87e87223-889c-4bbc-8d2e-42b20ead7968.jpeg?sign=1770407827-f59b9c7a79-0-dcf9893f1bad709bd538cddc857df8f94df2e1fad21fffbfa5440903a18b3f53',
  '素描风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_1796386f-f493-4374-843d-761896a953b8.jpeg?sign=1770407827-d4c53111b7-0-069a2c5b28294edac5a9a3de9120d536a85875882e8ca49998d8123648db2657',
  '粉彩风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_90686368-5751-442b-ab90-c37f3f4ca789.jpeg?sign=1770407828-c419291213-0-509e177d4554ee75480c885d4cb3621b6be3c63f174ac51a30794f77503f6c90',
  '版画风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_0a1cf96b-99e8-43b8-9d3a-7f3bd95ec9e7.jpeg?sign=1770407838-cabeb3a613-0-14ff3c01a1daf41fdfb2efa57c9debece565111387455dc744e089befbf2e231',
  '波普艺术': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_f82ede31-8e37-465b-b3bb-518b4f078359.jpeg?sign=1770407838-45ba413adf-0-04cb4645f89e945bdb10b3ac009a19ab242b69eeaab42b0b9d9d442cfb071400',
  '水墨风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_1d62523f-da10-4a94-a769-db86202e5d6b.jpeg?sign=1770407837-e77c4868c8-0-d469462ba1cff092ba2d3a164ea53b08d6c5f4cf11805f5852a7d35524409e84',
  '浮世绘风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_de1782e6-23cd-46e5-9d1c-39c1f749432d.jpeg?sign=1770407849-9eaf1fd473-0-91934ca5672a4c02966c9a0f12f161f7bc61f3cac1132959d856a23c9c727eab',
  '敦煌壁画': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_ef4d85a9-0201-4757-9bdb-3b1b3faf378c.jpeg?sign=1770407849-7d0839859c-0-ce5e257e2c1beffedaabc92f4720881690db38daf86d23e35a35f03740e1b28d',
  '唐卡风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_eaed8a9f-49ca-4b54-9265-491c266a8e90.jpeg?sign=1770407849-3ff3a5c5c6-0-b0cc4db94c64e74efb019917233942eb60b0d331cc973d2322b8c5b930d24fb4',
  '和风': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_069cbb0c-02f0-4e02-8456-92c4d9ffbcd6.jpeg?sign=1770407860-026fac752d-0-124834695d422606966310495b08510a2ffc6a30be02a01e42c5cf60b89fe752',
  '复古油画': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_bcc87377-9ad8-47ac-ace2-a27636cfce50.jpeg?sign=1770407862-4024b6346e-0-97f72d77583d61efb6302948d18654d29131887f89d8b3a713676b524b6f2348',
  '印象派': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_ff899ec2-b31b-4ecc-9e07-c9f39e6640f8.jpeg?sign=1770407860-5fac2306ad-0-47828c19ef5b411171354993b7acc28e593e34c5644e8edade8bd15eb7f89423',
  '野兽派': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_ca93666c-71e2-463f-8f55-25bc9a22dd19.jpeg?sign=1770407872-7a969b92f7-0-f0bad09421f618ba4faf52305f4d17733a9ade741ee538b1fcba4f82407703c5',
  '超现实主义': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_74301ff8-a883-4bf4-952d-c38687576de8.jpeg?sign=1770407872-04b0f8345e-0-471e50537f0e5b167de8f5c9d6de2d7ea3274b68c7a39bc7b83513b6c5a0369c',
  '赛博朋克': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_8a4eeed6-eaf6-4df1-b010-ffb172ce9532.jpeg?sign=1770407874-a99f8a4d4f-0-f6c2fefcee12319705ee356ffa688c9e482ae3c88bcfce05d0c631d6921df5b7',
  '废土风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_34277c61-9907-4f43-b295-f39d7255f4a8.jpeg?sign=1770407891-d1bf038a9d-0-3d9972a317ede4b05760148aaefe83e912730301841376ac2d4f9cc4229cf120',
  '太空歌剧': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_dde6be87-2c1b-4dcd-894c-0590b6909fb7.jpeg?sign=1770407885-670e4c50fa-0-d326868f2978e4057044636b07c0767713c9d12806934dcf581b42b16a1ffd03',
  '未来都市': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_43ecd4a7-f247-4be0-9f80-82bfd425a393.jpeg?sign=1770407884-1aeb9d1572-0-23ebf5d92f167b417e0ca283b7d78fb64b0b3d956b613cfba55f29d2dfcfefd5',
  '机甲风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_14602555-d480-4ab1-b9e6-de654bb20cfe.jpeg?sign=1770407902-f7e3e07c0c-0-558dd6f843b2cec419b09c26dfe27e41abe48ccc46ef973b0cf6d3ad2b49b661',
  '奇幻风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_1dafbd50-12eb-4471-b25c-c81d7b49227d.jpeg?sign=1770407903-6cc500e96c-0-ba54d57a49fc1d0510934b14155a8f2cfbdfac3cf25edcd74e09384dc163642b',
  '暗黑奇幻': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_b8efa973-19c7-4319-a48a-cb412344d5af.jpeg?sign=1770407902-00f1df2173-0-0667548e55f65331c7542e6c06dcbb2f2e83a32287f0396aa1b0afeea7efebeb',
  '童话风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_ac26ffe4-8ec9-4cbb-bde4-734606e3d01a.jpeg?sign=1770407916-5bb0b6d85e-0-07bffedf92f4f7576a6e4bfba42df7212828c3b6ddad52a408cc5c8cbc5fcbc6',
  '魔幻现实主义': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_9dd0fcec-54c3-4753-91b2-540c82113b3d.jpeg?sign=1770407919-bdf8446e54-0-3785dd44b56339fe8cbd8d941c2ff96889087b6a1a66bff25d10ee40724feff1',
  '工业设计': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_02098e58-c225-4a6d-818e-90ca8e202793.jpeg?sign=1770407912-d2b6de7d83-0-45b768d5daf4d94771aa3a36b798562d04f82970f038deddf52357b44ed6e8d8',
  '蒸汽朋克': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_547f8b53-abc9-48d2-9cb8-7c53482a43e7.jpeg?sign=1770407930-2b6b962ef3-0-8c0b167a07a9be73d8a878b4b065924869f1a1e075f4551a330914f2a2e3c63a',
  '柴油朋克': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_5a86cef5-c62f-432d-a994-cc3ced8feb0d.jpeg?sign=1770407930-1c740b1b2d-0-a7c02002bf6fab2378624f7dbf698c7bca065e613c43de3230d40bc74933310a',
  '机械科幻': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_31fc0a66-e199-4557-a0fd-eb2874f4120b.jpeg?sign=1770407929-a5e88c519a-0-febcebaea412d12c31df71f60dea95fb4223b831fa6fb40a33b86c00df742e8e',
  '像素风格': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_b139ed54-e775-4119-8f92-72ffb3214376.jpeg?sign=1770407940-7433d1eb7f-0-72226765a0cb438c55df03823ba000e3b254039bc8304626084ecf71bc99d3b4',
  '低多边形': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_74ecc244-02a6-4972-aa81-fb10871f1285.jpeg?sign=1770407939-645a504b14-0-78aca0c7630fe121e2f6dceb4b11b7289b9d53284f8d7ab4b52bc0a606206c44',
  '霓虹艺术': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_e5d5d4a9-df3c-48c7-99e1-e51bd5c7e924.jpeg?sign=1770407941-0106acc5c3-0-56da035ed4d09d1a4bbfbd0b45f1ef1a17bfdfa7b62b0040f22953e2f5b06f07',
  '未来主义': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_9472a4b1-ce87-4453-a35d-08cbb90c14ea.jpeg?sign=1770407955-1d81935025-0-3534e75e8339d9ef6c079fad1d8ba6806c7d2042abdb59154116e17bebe6a1bd',
  '极简主义': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_7d8efc88-d74a-4748-8daf-426ab6f048f9.jpeg?sign=1770407950-9d685346c7-0-863b4534870a16384a4482eef58ac12df3b0028048d50ecf1d7ce050dec1cd9a',
  '抽象主义': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_fd06728a-ec14-4bca-9e6c-482544275fee.jpeg?sign=1770407951-a7ea31aba3-0-777ad979f1d3f90390f1cbfd081a2710bc8b7bc2452694ba2b330200c92da6d0',
  '表现主义': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_a49d0a0f-7d36-42b9-b062-859f2abe0507.jpeg?sign=1770407976-0dbfa59aac-0-944c101cdeebfb07db9fa5f0b1d8020d4bf71d8d5be46d88a23746b43cf12ec9',
  '立体主义': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_366c8774-1546-43d3-874e-506fd2911ec1.jpeg?sign=1770407965-17c948cb82-0-877206c685e9502dc4e3ed0647faab4b9a13d223179c6f32816cdfc6cdf89c0f',
  '暗黑哥特': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_76febcb2-b03a-4eb0-b3f2-35dd17019d49.jpeg?sign=1770407968-de5aa77e47-0-01d935b733c425743c045ca6eec2030c60cf574e98cb7ccc8529211825eff0c8',
  '黏土动画': 'https://coze-coding-project.tos.coze.site/coze_storage_7591943850025812020/image/generate_image_d9cb429a-305e-4c14-a33c-31257869ff0d.jpeg?sign=1770407987-ab66341376-0-8024eb454d99b08afbf3aacc50162c943dc061e08760509054307765378b6e6e',
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
