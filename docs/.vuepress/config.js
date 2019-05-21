module.exports = {
    title: '她说',
    description: '我的个人网站',
    head: [ // 注入到当前页面的 HTML <head> 中的标签
      ['link', { rel: 'icon', href: '/img/meat.ico' }], // 增加一个自定义的 favicon(网页标签的图标)
    ],
    base: '/', // 这是部署到github相关的配置
    markdown: {
      lineNumbers: false // 代码块显示行号
    },
    themeConfig: {
      logo: '/img/logo.jpg',
      accentColor: '#ac3e40',
      nav:[ // 导航栏配置
        {text: '学习笔记', link: '/' },
        { text: 'Guide', link: 'https://github.com/tashuobutianhei' },
      ],
      sidebar:[
        {
            title: 'vue学习',
            collapsable: false,
            children: [
              '/Front/docVue/vue'
            ]
        },
        {
            title:'前端部署',
            collapsable: false,
            children: [
              '/Front/docfront/bushu',
              '/Front/docfront/fenli'
            ]
        },
        {
            title:'计算机网络知识',
            collapsable: false,
            children: [
              '/Front/docNet/net',
            ]
        }
      ],
      sidebarDepth: 2, // 侧边栏显示2级
    }
  };
