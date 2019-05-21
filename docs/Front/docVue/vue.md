
# vue源码分析
## 1.使用vue-cli的引入区别：
**runtime Only**：借助webpack的vue-loader编译为js，在编译时做，编译为render，使用render函数时。
**runtime Compiler**：在运行时做编译工作，使用标签格式使用该模式，使用render函数则不需要。
* 最终结果都是render函数渲染，如果用标签template则需要编译为render，所以需要在编译过程中选择runtime compiler即带编译器的版本。所以带render函数并使用runtime only则效率更高。可以作为性能优化的点。

## 2. vue关键流程

### 2.1 new vue后的一系列操作：
初始化：vue是一个构造函数，在构造过程中，混入了很多方法，初始化中，首先合并了options，然后绑定了相应的全局api和方法，并以此做初始化，生命周期的构建

**执行到这里就beforecreate的声明周期，初始化了生命周期，事件，render**

initData初始化数据时，会初始化props，method，data，并在其中做一层代理，去循环遍历方法，props，data中的key，所以也不允许有重复的名字。而最终使用this访问某个属性也是通过了一层代理，而代理对象其实访问为vm._data.属性。

**执行到这里就created的声明周期，数据已经初始化**

这个阶段做了一些判断，具体为：

* 初始化后则去根据el属性是否有而去使用vm.$mount去挂载vm

***mount时，如果vue挂载在body，html下会出错，源码中进行了判断***

* 挂载时，优先判断是否为render是否存在，存在直接用，没有render就转化为template，这需要编译的过程，最终挂载前只认render。

* 使用mount挂载，mount则调用mountComponent进行挂载，在相应的挂载之前会根据相应的runtime版本进行判断所用的格式是否正确，如Only中使用render，Compiler使用template。

**执行到这里就beforemount的声明周期，数据已经初始化，准备挂载**

 **挂载过程**：挂载使用vm.$mount函数，其中使用了mountComponent，绑定了watcher，调用_render生成虚拟Node，使用_updata进行dom更新。
 
 * $mount实现：首先尝试获取render，根据不同情况，进行编译与否，最终全部变为render，其中绑定了渲染watcher（首次和更新数据时都会触发渲染watcher），最终挂载时使用_updata进行的

 ***插一嘴，virtual DOM，是因为dom的渲染开销非常大，而virtual dom是一个对象，简化了dom的方法和属性而vnode就是对真是dom的抽象描述，也就是对virtual dom的的描述，而虚拟dom其实还会创建一个正常的dom，但是对变更就行了缓存，对渲染也进行了优化***
 
 *接下来分析_render和_update的具体实现*

*  render函数的实现过程：
    * 整体是一个编译过程，返回vnode， 执行renderProxy，在之前已经被初始化，进行检查如果，如果使用的数据并没有被定义就会被报错。 不同的render函数，调用不同的构建方法（用户构建的render，和编译的render，但是差别不大）最终都执行createElement，由于可能是有子vnode所以分为有data无children数组和无data有children数组进行处理，最终调用_createElement，在其中进行分情况对vnode进行创建，
    * 期间也会根据有相应的检查，比如标签是否为可使用的标签，以及对组件的处理，最后render返回一个vnode，开始对vnode进行创建dom

***插一嘴，在对创建vnode时，对子数组进行打平，因为传进来的render的子可能是多层嵌套的，所以进行打平， ，期间有一个优化，因为vnode以及分类型进行了创建，如果相邻的都是文本节点，那么就会合并为一个***

*  updata方法实现过程：将获得的vnode渲染为真实dom。
   * 调用时机：首次渲染，数据改变。核心方法为patch。
  * 执行过程：判断是否为浏览器端，因为vue在服务端不进行dom渲染，判断后调用 **vm._patch_** 方法,patch为一个高阶函数，由creatPatchFunction创建，其中有创建了很多dom方法。 又在其中的modules部分（为定义的钩子，事件，属性，css属性等）混入了大量的属性。
  
  *updata的核心为patch方法，介绍一下patch*
  
* patch方法
   * 参数：patch有 4个参数，oldVnode表示旧的Vnode节点，可能时一个存在或者不存在的Dom对象；Vnode表示_render后的Vnnode节点；hydrating表示是否服务端渲染；removeOnly是为transition-group使用的。
   * patch的关键步骤：将oldVnode转化为一个vnode节点，然后将_render后的vnode节点进行diff，进行判断，然后判断tag参数是组件还是dom使用creatElm进行挂载。
   *  creatElm方法，作用为将创建好得真实dom挂载在vm上，他是一个从父到子的过程，先创建父节点，然后依次创立子节点。将父子都创建好的dom合并为一个dom，将唯一的父节点进行挂载， 即挂载。在创建时，会区分是基础的标签（tag），还是组件，会调用不同的方法，createElm和createcomponent进行创建
       
***插一嘴，在patch中利用curring化函数进行对dom的一个抽象，因为vue会跑在不同的平台上，而因此使用高级技巧，对相应的dom操作按照平台的不同进行了抽象***
***插一嘴，进行插入时，是先插入子节点，后插入父节点，最后将完整的父挂载到vm上）安装了钩子***
***patch中有diff算法，在数据改变时进行计算。***

*到此，一个简单没有组件的vue实例化的过程就结束了。*
为什么要说是一个没有组件的实例的过程那？这个过程只是对于使用原生的标签，借用了vue.js进行渲染了而，并没有执行到关于组件有关的东西。

**执行到这里无组件的实例过程中：mounted钩子执行**


***简单总结一下：首先调用new vue，执行vue的init方法去初始化方法属性，然后调用$mount进行挂载，在$mount中，使用compile进行编译，编译后使用render方法转化为vnode，最后使用update中的patch转化为一个真实DOM。***

![790ecca1e5871d3c41197ecf7eb90f99.png](en-resource://database/1444:1)


**有多组件的时候：

**组件vnode创建：**
在patch的时候会存在调用createElement方法，在这里会判断tag，如果是一个普通的html标签就会像上面的去渲染，如果是一个组件就会使用createcomponent创建一个组件的Vnode。

* createComponent：
   核心步骤：构造子类构造函数，安装组件钩子，实例化vnode。
   * 构造子类构造函数：    
组件在构造时，会使用全局api Vue.extend进行扩展，使用子组件对象创建了一个sub对象（构造器），采用原型继承Vue，对子组件也进行初始化，继承的是全局的VUE的init方法。
继承过程中，将vue的全局api都继承给相应的子组件，其中对进行了异步组件，v-model，options合并，方法检测，数据检测的操作。
然后就是执行子组件的init方法了，这个和之前的也不相同
***插一嘴：extend会对传入的组件obj对象进行检测，判断标签名是否合理。其中有优化的地方就是，采用了对象池，如果传入的子组件对象已经被构造了，那么就直接返回***
   * 安装组建钩子：
 然后进行安装组件钩子，init，prepatch，insert，destroy，在安装钩子时，对钩子进行了合并，如果已经安装了相应的钩子进行合并操作。
最终生成了组件的vnode，组件vnode的children属性为空，但拥有componentOptions中拥有children。
   * 实例化Vnode：
   使用new Vnode实例化一个vnode，和普通的vnode不同的是，组件的vnode没有children。

*使用createComponent创建完vnode后就继续要用patch进行挂载了*

* patch：
            深度遍历的过程，正在激活的子组件vm实例，进行合并，建立了父子实例。合并了options，其中对子组件按照父组件的模式进行了构建，比如进行了render函数的编译，mountComponent的调用，watcher方法的绑定，updateComponent的使用，子组件生命周期的建立，根据render生成渲染vnode，进而执行updata方法，再调用_patch_进行dom，最终返回一个dom。然后进行插入到父组件中。
            而insert的顺序是先子后父，是先对子组件进行插入，然后对父组件进行插入，因为是先进行父组件的patch其中又进行了遍历，到了子组件，然后进行了子组件的patch，所以在执行具体的patch时，是先进行子组件的insert，然后返回到父组件中。

**多组件实列过程中mounted钩子执行**

### 2.2 **配置合并**：Vue进行初始化时，子组件进行初始化时 
*  Vue.mixin：进行合并配置，调用mergeOptions进行配置合并，将child和parent进行合并，如果子定义了mixin和extend就进行递归调用。
mergeOptions中，对父和子的属性进行遍历，如果遇到重复的则按照vue的配置中的合并策略进行相应的合并，对于不同key有不同的合并策略，比如生命周期合并策略，合并和返回的为一个数组。
*  在组件初始化时也进行了合并，但是策略相对比较简单。 initInternalComponent 进行合并，合并更快，合并后保存在vm.$options中，

### 2.3 **生命周期**：  
初始化生命周期->初始化事件->初始化render->**beforeCreate（vueX,vueRoute在此时混入**->初始化数据，属性，方法 ，**created**->挂载前的一些判断->**beforemount**->根vue挂载/有子组件，执行vm._render,vm_.update进行挂载->**mounted**。

***注意：beforemount时，是从父组件进行开始递归，然后在子组件队列中，是子组件进行挂载，然后子组件挂载完后，父组件再进行mounted***

关于**updated**和**beforeUpdate**的执行是和双向绑定有关的。
如果数据改变了，会执行**beforeupdate（执行时机：watcher的before函数）**，在**nextTick**后，会在渲染watcher中判断数据，如果数据进行了改变，并且已经进行**mounted因为这数据必须被挂载了，然后改变了才会执行updated**则只需**updated(执行时机，flushSchedulerQueue)**。

在销毁过程中也和挂载一样，是**befordestroy**是先父后子，而**destroyed**是先子后父。


## 3. 组件内部 
### 3.1 **组件注册**：
* **全局注册**： 使用Vue.extend转化为一个构造器，在构造过程中，很根据所传入的注册组件名，进行查找，找不到会转为驼峰再去找，所以是支持驼峰的。找到后会进行解析为一个构造器，然后进行创建组件,再把组件挂载到vue.options.components.
* **局部注册**：  通过合并子组件配置，由于初始化时会初始化sub，此时进行合并,配置即可。也是在extend中。 在组件的 Vue 的实例化阶段有一个合并 option的逻辑所以就把 components 合并到 vm.$options.components 上，这样我们就可以在 resolveAsset 的时候拿到这个组件的构造函数，并作为 createComponent 的钩子的参数。
全局注册时，是在Vue中创建一个构造器，所以在全局都可以进行访问，但是局部注册时在当前vue实例中和sub进行的合并，所以只能局部访问。

***注意，局部注册和全局注册不同的是，只有该类型的组件才可以访问局部注册的子组件，而全局注册是扩展到 Vue.options 下，所以在所有组件创建的过程中，都会从全局的 Vue.options.components 扩展到当前组件的 vm.$options.components 下，这就是全局注册的组件能被任意使用的原因。***

### 3.2 **异步组件**
异步组件又三种注册方式，使用工厂函数，promise，高级异步组件。
* **异步组件的创建过程**：使用settimeout进行异步，在使用这种形式的异步组件注册时，传递的并不是一个对象，所以在执行createComponent时判断cid为undifiend,所以不会使用extend进行继承，而是进入异步创建的逻辑，执行resovleAsyncComponent的方法，这个方法定义了三种组件创建的方式
* **工程函数式的异步组件**
```
Vue.component('async-example', function (resolve, reject) {
   // 这个特殊的 require 语法告诉 webpack
   // 自动将编译后的代码分割成不同的块，
   // 这些块将通过 Ajax 请求自动下载。
   require(['./my-async-component'], resolve)})
```
定义了resolve，reject，once函数，然后调用**factory函数**进行工厂函数创建，将resolve和reject作为参数传入，在函数中会先发请求去加载我们的异步组件文件，然后根据结果执行resolve和reject。拿到后在判断是否一个普通对象，然后使用extend进行构造。然后最后会去判断sync，然后执行**vm.$forceUpdate**方法，这个方法调用了watcher和update，进行渲染和更新。

* **promise的异步组件**
```
Vue.component(
  'async-webpack-example',
  // 该 `import` 函数返回一个 `Promise` 对象。
  () => import('./my-async-component'))
  
```
由于import的值直接为promise则不需要手动实现更多，直接内部就使用promise的原理进行异步加载。

* **高级异步组件** 
```

const AsyncComp = () => ({
  // 需要加载的组件。应当是一个 Promise
  component: import('./MyComp.vue'),
  // 加载中应当渲染的组件
  loading: LoadingComp,
  // 出错时渲染的组件
  error: ErrorComp,
  // 渲染加载中组件前的等待时间。默认：200ms。
  delay: 200,
  // 最长等待时间。超出此时间则渲染错误组件。默认：Infinity
  timeout: 3000})
Vue.component('async-example', AsyncComp)
  
```
高级的异步加载多了很多判断，会判断配置的loading，error组件是否存在，存在就会体会factory.erorrComp和factory.loadingComp，然后在加载过程中安装加载状态patch出不同的组件。
* 异步组件的patch，在使用resovleAsyncComponent的方法时会创建一个注释节点作为占位符，除非使用高级异步组件0 delay去加载一个loading组件。然后在加载后执行forceRender时会触发重新渲染，根据不同状态走正常组件render，patch的功能。


 **总结，不管是全局组件还是局部组件都是 注册 合并 渲染这几步，开始的时候，会在createComponent中判断时异步还是同步，如果是同步都是基于vue.extend进行继承，然后进行options的合并，合并后全局组件在vue.options中，而局部组件在vm.options中，所以一个可以全局访问一个不可以，在渲染的时候都使用patch进行渲染。如果是异步，就使用异步加载方法resovleAsyncComponent进行加载，加载好后进行宠媳渲染，然后走和同步一样的方法。**
 
 ****


## 4. 响应式原理：

### 4.1 **响应式对象**：
响应式原理的基本是使用defineProperty实现响应式对象，在vue实例初始化的时候，会执行initstate方法，在该方法中又会执行initdate和initprops，这个两个方法的内容大致相同，做了两件事：
1. 将prop和date进行带来，将vm._ date.xxx和vm.props.xxx代理为vm.xxxx，实现的原理就是加了一层代理,将this[scourcekey][xxx]代理成了 this[xxx]].
2. 将props和date进行了构建为响应式对象，构建时使用了Observer。
   * **Observer**：观察者,一个类，使得一个对象变为可被监听的对象，在改变时会被其他监听（set，get）。定义了一个__ob__属性，作为观察者的属性，将data和props进行封装为响应式，如果是数组就递归观察数组的每一项，如果是对象就递归观察对象的每个属性，具体把属性变为响应式调用了defineReactive方法    
      * **defineReactive** ：深度的遍历了对象，将对象的每个属性变为响应式，object.defineProperty使用get，set进行拦截对属性的访问。get：**依赖收集**，set：**派发更新**
 
 
### 4.2 **依赖收集**：
在get一个数据时，获得所有与之相关的watcher进行添加，在其进行set时这些watcher进行修改。
   *  **依赖于Dep对象**：Dep进行依赖收集，建立数据和watcher之间的关系。dep的属性有target表示当前进行渲染的watcher，subs数组表示所有与之建立关系的watcher。dep.denpend（）执行了相应的watcher的方法，该方法将和该数据相关联的所有watcher加入到dep.subs数组中。
   * 在挂载时会调用$mount->updata时会去调用render，实例化每一个watcher，进而调用dep.add，将所有watcher放在一个deps数组中。所有就需要cleanupdeps，意思是在修改数据先将之前的依赖清空，然后render会进行重新添加。简单来说，就是每次修改数据之后，都会重新去找依赖，比如出现了v-if，在修改数据之前，v-if中的数据的watcher在deps中，但是修改了数据，可能v-if不被渲染，那么就不需要将其加入到deps中，所以使用cleanupdeps进行清空。

##### 4.3**派发更新**：
set更新时，对和该数据有关的watcher进行更新。
* 当使用set更新一个数据时，如果是对象，那么就将其变为一个observe，如果是数据，就将其使用**dep.notify**进行派发更新，在notify中，遍历之前的deps数组，调用他们的updata方法，在updata中，将调用queuewatcher，将需要改变的watcher放到一个队列中，队列的作用就是同时改变了很多数据，但是使用队列将他们保持在一个tick中。
***优化： 在nextTick中：在下一个tick中执行相应的操作，操作具体内容为，首先将队列中的watcher按照id从小到大排序。然后遍历这个队列 ，拿到每个watcher执行run方法，（其中如果出现了无限更新就会报错）run方法中，对比新值和旧值，如果不一样就进行渲染过程，渲染时执行相应的watcher中的render进行渲染***   

### 4.4 **小结**
总结一下这一块，有点乱了：
vue的双向绑定这里使用的方法是数据劫持+发布订阅模式进行的。
捋一下流程吧：
1. 创建一个vue实例，通过compi将el转化为vnode。
2. 初始化数据执行initstate方法，这里具体又执行initdate和initprop,利用**observer**将date和props转化响应式对象(拥有set和get监听)。
3. 这个时候数据初始化完成，也变成了响应时对象，可以进行数据劫持，等待被使用。
4. mount时刻，利用render函数将建立一个个watcher，又利用update进行挂载。这时将一个个的watcher加入到**deps数组**中
5. 在挂载时之前的数据就被使用了，这是响应式对象就将对应的watcher加入到相应数据的**dep.subs数组**中
6. 当数据改变时，会触发数据set方法，会执行dep.notify方法，将之前的**dep.subs**数组中的watcher拿出来进行放入一个队列，在进行diif和一系列优化后。使用异步nexttick更新。

![40c0fe80deba529afcd7e478137b3baf.png](en-resource://database/1446:1)

*简单的说使用构造响应式对象进行数据劫持，在数据被访问和修改时都可以进行可监控的操作。然后在使用数据时（get）将一个渲染和数据的关联（watcher）利用dep对象推入数据本身的dep.subs数组中。然后在修改数据时(set)又执行watcher中的run方法，进行重新渲染*

### 4.5 **nextTick**：
* **tick的概念**，事件循环一次主线程的完成就是一个tick。
* **nexttick**：vue为了做优化，将更新的数据放在一个队列中，然后再统一将他们进行dom更新，这种dom更新机制就时一个nexttick，nexttick是vue利用异步化去实现的。
* **调用**：nextTick有两种调用方式，通过Api调用，在事件循环后dom更新后调用。
* **实现**，是将callback集合到callbacks数组中，在下一次执行nextTick中进行执行上一个nextTick中的callbacks中进行异步实现。callbacks,接受回调函数的列表，VUE对宏任务和微任务的实现分别为：宏任务首先判断是否支持setImmediate（但是只有高级才支持）再判断是否支持MessageChannel  API，最后都不行则使用setTimeout，对于微任务，首先判断promise，如果没有则降级为宏任务的执行。默认使用宏任务。
       调用处为全局Vue.nextTick和render中 ，其中根据浏览的支持情况进行判断进行不同的函数 ，对于宏任务，
   *nextTick实现时，传入了一个回调函数，使用trycatch进行执行回调，接下来进行判定是否为微任务或者宏任务，使用pending判断当前是否为正在执行，默认为false，在执行前置位true*
   
***所有说很多数据的变化如果是同步执行的，那么就会导致数据变化后无法同步的获取变化后的dom，因为此时dom还没有更新，若想获取更新后的dom，就是用nexttick***


### 4.6 **检测变化的注意事项**：
有些数据的变化无法被检测到，比如：
```
var vm = new Vue({
  data:{
    a:1
  }})// vm.b 是非响应的
 vm.b = 2
```
因为在对对象进行set/get进行包装时，必须触发器set才可以。

* Vue.set:全局api可以让数据的直接变化并被触发渲染watcher的重新渲染。
   * Vue.set（this.obj，key，value);
   * Vue.set（this.array，index，value);

*Vue.set的实现：对于数组，使用splice进行修改数据，对于对象直接安装键值对进行修改。如果不行则手动进行将数据变成响应式对象。*
    
    

##### 4.7: **计算属性和侦听属性**:
*计算属性也好，侦听属性也好，他们的本质都是watcher，只不过不同于渲染watcher*
* **几种watcher**：
   * **渲染watcher**：负责渲染的watcher，在监听到数据改变时会触发相应的渲染的更新操作。
   * **deep watcher**:在watcher中加入deep属性，可以进行深度遍历，监听对象中的所有属性和子属性。
   * **user watcher**:监听数据变化后执行相应的handle操作。
   * **computed watcher**：对数据进行计算，监听其中的数据，在其中的数据变化并且计算结果也变化的时候进行改变。
   * **sync watcher**:数据更新后不走nexttick，同步更新dom
  
 * **计算属性原理**
   * **初始化**：使用vm.computedWatchers创建一个空对象，接着对computed对象做遍历，拿到计算属性的每一个依赖的属性userDef，然后去获取每一个userDef的getter，为每一个getter创建computed watcher，然后判断计算属性的key是否已经存在，不存在就使用defineComputed响应式
      * **defineComputed**：这个方法主要是实现了响应式，重点是getter部分，使用createComputedGetter创建getter部分。到此初始化结束，还没有计算结果，computed watcher不会立刻求职，
   * **render时** 当render函数访问时，触发getter然后执行依赖收集的过程，然后才使用watcher.evaluate去求值。
      * **evaluate** ：求值的方法，获取依赖的属性的getter，然后求值返回。
   * **依赖的数据修改时**：依赖的属性改变时，会触发setter，然后通知所有watcher进行update，当计算属性接受到通知的时候，如果没有人去订阅这个计算属性，那么就不会求值。
   *只有计算属性的结果和依赖的数据都变化的时候才会执行重新渲染*
   *之所以说计算属性和方法计算出来的结果一样但是有区别的地方就在于缓存，计算属性并不会每次都计算，因为比如一个复杂的计算，但是依赖的值没有变化就会缓存这个结果，这个缓存只是因为没有触发getter，但是方法就会每次都执行。*
   
* **侦听属性原理**：
   * **初始化**：在vue进行初始化阶段的initstate函数中，在初始化了computed后进行initwatch，在initwatch中遍历watch对象，然后拿到每一个hadler，
这里的watch的一个key对应多个handler，所有为hanler数组。拿到handler后调用createWatcher，在该函数中调用了vm.$watch函数。
      * **$watch**：会判断传入cb参数是否为对象，如果是对象就会调用createWatcher方法，转化为一个函数，然后new一个watcher，这里的watcher是一个**user watcher**，当检测的数据变化的时候就会执行watcher的run方法，进行回调函数的执行。**最后返回一个移除这个watcher的方法**。
      
### 4.8:  **动态更新中的更新过程**
* 当watcher检测到数据变化，会触发watcher的回调执行run方法，进而执行_update方法，在update方法中和mount过程不同的是这次已经有了一个oldnode了，这时就走进了另一条路了，这里会通过sameVnode判断接下来该走哪条路，**beforeUpdate钩子**，如果相同就会根据diff算法递归下去，期间继续sameVnode，**这个过程包括diff在另一篇笔记中已经清楚说明了** 如果不同就会走**创建新节点，更新父占位节点，销毁老节点**。
  *  **sameVnode**：一个很重要的判断逻辑，目地时判断是否可以复用，判断key是否相等，对于同步组件判断，data，input，isComment类型是否相同，对于异步组件判断asyncFactory是否相同。
```
  function sameVnode (a, b) {
  return (
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
   )}
   
```
   * **diff过程简单描述**：简单描述一下dff的过程，具体在另一篇笔记中，首先根据sameVnode进行判断，在为true时（表示可复用），然后进行递归，一层和一层比较，对于每一层递归判断有没有子节点，如果有然后进入子节点，进行diff，对于一个新旧的节点，转化为一个队列，新队列和旧队列，设置newstart，newend，oldstart，oldend。当oldstart>oldend时就比较完了，现在开始比较
      1. oldstart和newstart比较，oldend和newend比较，如果相同就进行patch
      2. oldstart和newend比较/oldend和newstart进行比较，如果相同就调换old队列位置然后patch
      3. 如果都没比较出来，就从old的哈希表中找存不存在newstart：
         * 如果存在就该节点移动到old队列队首
         * 如果不存在，就创建新节点放在old的队首
      4. 到这就比较完了，然后这时候看
         * 如果oldstart>oldend，就new剩下的部分放到old的对尾
         * 如果newstart>newend，就old部分多余的删除
 
 ****
## 5 扩展点：

### 5.1 **事件event解析**：
vue没有实现事件，只是将dom事件和自定义事件进行区分，然后使用事件中心管理了自定义事件。
* **编译阶段**：简单的梳理一下编译阶段做的重要的事情：addHandler函数中，根据native判断时一个普通事件还是纯原生事件还，然后分别记录在el.events，el.nativeEvents中，然后在codegen阶段使用genHandlers方法遍历events，获取各种handler和事件修饰。最终render编译得到vnode。
```
//父组件事件
{
  on: {"myselect": selectHandler},
  nativeOn: {"click": function($event) {
      $event.preventDefault();
      return clickHandler($event)
    }
  }}
  
//子组件事件
{
  on: {"click": function($event) {
      clickHandler($event)
    }
  }}

```

* **运行时的操作**：编译过后会，在运行时会分为DOM事件和自定义事件进行处理
   * **DOM事件**：获取vnode.data.on，targer就是vnodeDom对象，然后做了对v-model的处理，接下来进行获取updateListeners，这个函数遍历on，然后去添加事件**监听**，遍历oldon（之前存的）去**移除**事件监听，具体监听和移除的方法时外部传入的，因为它既可以处理原生DOM也可也处理自定义事件。*具体遍历过程，先判断事件名的特殊标识，比如once，passive等修饰符，然后对事件回调函数做处理，对一个事件有多个回调函数，第一次添加时直接添加，第二次执行时，就吧新的回调函数赋值给他，然后拿到oldon进行移除* 对于原生Dom就是使用原生的事件添加和移除方法。*注意的时如果DOM事件中修改了数据，会把它封装成宏任务，推入队列在nextTcik后执行*
   * **自定义事件**：自定义事件只能在组件上用，如果组件要使用原生事件需要加native修饰符，普通原使用native修饰符无用。
      * 在render的时候，如果是一个组件节点，那么会在createComponent创建一个vnode，在这个过程中，把data.on赋值给listeners，把data.nativeON赋值给data.on。对于data.on创建原生DOM，对于listeners进行自定义事件的处理，这里的处理和原生DOM不同的地方就是add和remove的过程，这里的add和remove使用的时vue自己定义的事件中心
     * 将所有事件用vm.events存储起来，执行vm.$on时，把事件名称和回调函数存储起来，执行vm.$emit时根据事件名找到回调函数然后执行，当执行vm.$off时移除事件，执行vm.once时会内部执行移除vm.$on然后在回调执行一次后通过vm.off移除事件。之所以使用emit可以父子组件通信是因为emit虽然注册在当前组件的vm上但回调函数在父组件上，

**总结**：那么至此我们对 Vue 的事件实现有了进一步的了解，Vue 支持 2 种事件类型，原生 DOM 事件和自定义事件，它们主要的区别在于添加和删除事件的方式不一样，并且自定义事件的派发是往当前实例上派发，但是可以利用在父组件环境定义回调函数来实现父子组件的通讯。另外要注意一点，只有组件节点才可以添加自定义事件，并且添加原生 DOM 事件需要使用 native 修饰符；而普通元素使用 .native 修饰符是没有作用的，也只能添加原生 DOM 事件。
****
## 6 插件分析：
1
### 6.1**vueX分析**：
* **核心思想**：单向数据流在组件中可以很好的传递，也可以在父子组件中进行传递，但是遇到一个数据要被多个组件共享，或者传递很复杂的时候单向数据流就麻烦了，所以vuex就是将单个组件维护的数据抽离出来到一个全局。在全局中vuex做到了响应式和状态可监听
* **树形结构**：将一个大store拆解成若干个小的modules进行管理，每个modules都封装了自己内部的的getter，state，mutation，action，然后使用命名空间进行管理，如果不拆成多个模块，则就默认看作是一个大的模块，所有vuex在构建的时候是一个深度遍历的过程。

***actions(异步，api)->mutations（真正操控数据）***

* **vuex初始化**：
    入口：vuex是一个对象，有Store属性，install方法，version，以及map（state，mutations，getters，actions，createNamespacedHelpers），在使用vue.use（vuex）时会调用install方法进行初始化，接下来执行applymixin，在该方法中，对vue版本做了判断，然后使用vue.mixin在**beforeCreat**e的钩子中混入了vuexInit方法，在该方法中出给**vue.$option**属性绑定了**$store**。

* **new vuex.store时**
    会调用store这个构造函数，在构造函数开始时，对promise做了判断，**因为vuex依赖promise**，接着就是初始化，初始化了actions,mutations,modules等对象，由于vuex支持响应式也初始化了watcher，初始化了dispatch和commit方法并绑定了上下文环境。接着调用了**installModule**方法（对actions，mutations等做了赋值）和**resetStoreVm**（响应式）通过vue进行 双向绑定 方法，同时安装了devtool方法。

* **具体分析**
   modules的初始化：使用new ModleCollection(options)进行初始化，将最外层作为rootmodule传入，然后使用register（path，rawmodule，runtime）方法进行注册，在该方法中使用new module（）进行模块建立，将配置（每个模块的state，mutations，actions等）传入，然后递归调用register，根据path建立父子关系。
   * **installModules（this,state,[ ],this._modules.root）的使用**：根据path，namespace来寻找各自的module，然后使用makelocalcontext来进行命名空间有关的处理，对命名空间进行拼接。 然后调用forEachMutation/Action/Getter注册各个方法，

vueX相关Api：
*  数据获取：
   * store.state：store._rootModuel.state
   * store.getter:  store._wrapperGetter函数的返回值
 * 数据存储：
    * commit：拿到type，然后在this,mutations中寻找，然后执行warppedMutationHandler，将我们的定义的方法进行执行，同步执行。
   * dispatch：可以异步调用，定义一个异步的action，本质上是去调用context.commit，但是可以通过异步控制调用时刻。异步的实现是对结果进行promise化。
        语法糖：mapState/Getters/ 调用normalizeMap进行遍历拼接，返回一个对象。
        mapActions/mapMutations 
        registerModule(path,module,runtime):动态注册module
        unregisterModule(path):注销module







