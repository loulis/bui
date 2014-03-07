/**
 * @fileOverview 线形式的数据图序列
 * @ignore
 */

define('bui/chart/lineseries',['bui/chart/cartesianseries','bui/graphic','bui/chart/actived'],function (require) {
  
  var BUI = require('bui/common'),
    Cartesian = require('bui/chart/cartesianseries'),
    Util = require('bui/graphic').Util,
    Actived = require('bui/chart/actived');

  function trySet(obj,name,value){
    if(obj && !obj[name]){
      obj[name] = value;
    }
  }

 

  /**
   * @class BUI.Chart.Series.Line
   * 使用线连接数据的数据图序列
   * @extends BUI.Chart.Series.Cartesian
   */
  function Line(cfg){
    Line.superclass.constructor.call(this,cfg);
  }

  BUI.extend(Line,Cartesian);

  BUI.mixin(Line,[Actived]);

  Line.ATTRS = {

    type : {
      value : 'line'
    },
    elCls : {
      value : 'x-chart-line-series'
    },
    /**
     * 是否忽略null的值，连接null2边的值
     * @type {Boolean}
     */
    connectNulls : {
      value : false
    },  
    /**
     * 线的配置
     * @type {Object}
     */
    line : {

    },
    /**
     * 处于触发状态的线的配置项
     * @type {Object}
     */
    lineActived : {

    },
    /**
     * 如果横坐标是数字类型，则通过点的间距来决定点
     * @type {Number}
     */
    pointInterval : {
      value : 1
    },
    /**
     * 如果横坐标是数字类型,点的起始值
     * @type {Number}
     */
    pointStart : {
      value : 0
    },
    /**
     * 增大线的触发范围
     * @type {Number}
     */
    tolerance : {
      value : 20
    },
    /**
     * 是否平滑的线
     * @type {Boolean}
     */
    smooth : {
      value : false
    }
  };

  BUI.augment(Line,{

    /**
     * @protected
     * 处理颜色
     */
    processColor : function(){
      var _self = this,
        color = _self.get('color');
      if(color){
        var line = _self.get('line'),
          markers = _self.get('markers');
        trySet(line,'stroke',color);
        if(markers){
          trySet(markers.marker,'stroke',color);
          trySet(markers.marker,'fill',color);
        }
      }
    },
    /**
     * @protected
     * 鼠标进入事件
     */
    onMouseOver : function(){
      var _self = this,
        parent = _self.get('parent');
      _self.on('mouseover',function(){
        if(parent.setActived){
          parent.setActived(_self);
        }
      });
    },
    /**
     * @protected
     * 鼠标在画布上移动
     */
    onStickyTracking : function(ev){
      var _self = this,
        point = ev.point,
        markersGroup = _self.get('markersGroup'),
        marker = _self.getSnapMarker(point.x);
      markersGroup && markersGroup.setActived(marker);
    },
    /**
     * @protected
     * 内部图形发生改变
     */
    changeShapes : function(){
      var _self = this,
        points = _self.getPoints(),
        lineShape = _self.get('lineShape'),
        path = _self.points2path(points);
      if(lineShape){
        if(Util.svg && _self.get('smooth')){ //曲线图，先获取到达的path
          var prePath = lineShape.getPath();
          lineShape.attr('path',path);
          path = lineShape.attr('path');
          lineShape.attr('path',prePath);
        }
        Util.animPath(lineShape,path);
      }
    },
    /**
     * @protected
     * @ignore
     */
    draw : function(points,callback){

      var _self = this,
        animate = _self.get('animate'),
        duration = _self.get('duration'),
        lineShape,
        path = '';

      if(!animate){
        path = _self.points2path(points);
        lineShape = _self._createLine(path);
        BUI.each(points,function(point){
          _self._drawPoint(point);
        });

        _self.drawInner(points);
        after();
      }else{
        lineShape = _self._createLine(path);
        var cur = 0,
          sub = [],
          count = points.length;
        //动画生成线和对应的点
        Util.animStep(duration,function(factor){
          var pre = cur;
          cur = parseInt((factor) * count,10);
          if(cur > count - 1){
            cur = count - 1;
          }
          
          if(cur != pre){
            sub = points.slice(0,cur + 1);
            path = _self.points2path(sub);
            lineShape.attr('path',path);
            _self.drawInner(sub);
            for(var i = pre; i< cur; i++){
              _self._drawPoint(points[i]);
            }
            
          }
          if(factor == 1){
            _self._drawPoint(points[cur]);
          }
        },after);
      }
      //_self.set('lineShape',lineShape);
      /**
       * @private
       */
      function after(){
        
        _self.drawTracker(points);
        callback && callback();
      }
      
    },
    /**
     * @protected
     * 绘制内部内容
     */
    drawInner : function(points){

    },
    //绘制节点相关的label,marker
    _drawPoint : function(point){
      var _self = this;
      if(_self.get('markers') && !_self.get('markersGroup').get('single')){ //如果只有一个marker暂时不生成
        _self.addMarker(point);
      }
      if(_self.get('labels')){
        _self.addLabel(point.value,point);
      }
    },
    //创建折线
    _createLine : function(path){
      var _self = this,
        lineAttrs = _self.get('line'),
        cfg = BUI.mix({},lineAttrs);
      cfg.path = path;
      lineShape = _self.addShape('path',cfg);
      _self.set('lineShape',lineShape);
      return lineShape;
    },
    //绘制触发事件的path
    drawTracker : function(points){
      var _self = this,
        lineAttrs = _self.get('line'),
        tolerance = _self.get('tolerance'),
        path = _self.points2tracker(points),
        cfg = BUI.mix({},lineAttrs),
        preWidth = Number(lineAttrs['stroke-width']),
        shape;

      cfg['stroke-width'] = preWidth + tolerance;
      cfg['stroke-opacity'] = 0.001;
      cfg.path = path;
      shape = _self.addShape('path',cfg);
      _self.set('trackerShape',shape);
    },
    //将点转换成Path
    points2path : function(points){
      var _self = this,
        smooth = _self.get('smooth'),
        connectNulls = _self.get('connectNulls'),
        path = '',
        preItem,
        str;
      if(points.length <= 2){ //少于3个点不能使用smooth
        smooth = false;
      }

      BUI.each(points,function(item,index){
        if(item.value == null){
          if(connectNulls){
            return;
          }
          str = '';
        }else{
          str = (preItem == null || preItem.value == null) ? (smooth ? 'M{x} {y} R' : 'M{x} {y}') : (smooth ? ' {x} {y}' : 'L{x} {y}');
          
        }
        
        path += BUI.substitute(str,item);
        
        preItem = item;
        
      });
      return path;
    },
    //获取tracker的路径，增加触发事件的范围
    points2tracker : function(points){
      var _self = this,
        tolerance = _self.get('tolerance'),
        first = points[0],
        path = 'M' + (points[0].x - tolerance) + ' ' + points[0].y;
      BUI.each(points,function(item,index){
        var str = 'L{x} {y}';
        path += BUI.substitute(str,item);
      });
      return path;
    },
    /**
     * @protected
     * 设置图形的激活状态
     * @param {Boolean} actived 是否激活
     */
    setActiveStatus : function(actived){
      var _self = this,
        line = _self.get('line'),
        lineShape = _self.get('lineShape'),
        lineActived = _self.get('lineActived');
      if(actived){
        lineActived && lineShape.attr(lineActived);
        //_self.toFront();
      }else{
        line && lineShape.attr(line);
        var markersGroup = _self.get('markersGroup');
        markersGroup && markersGroup.clearActived();
      }
    },
    
    /**
     * 获取逼近的marker
     * @return {BUI.Graphic.Shape} 逼近的marker
     */
    getSnapMarker : function(offsetX){
      var _self = this,
        markersGroup = _self.get('markersGroup'),
        rst = null;
      if(markersGroup){
        rst = markersGroup.getSnapMarker(offsetX);
      }
      return rst;
    }
  });

  return Line;
});