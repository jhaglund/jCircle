/*
jCircle.js
Copyright Joshua H. Haglund, except for Roman Black's contributions
http://josh.isgrowing.net/jCircle.html

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function($){

  var radianConv = Math.PI/180
    , radianMax = Math.PI*2
    , romanblack = function( x, y ){
    // Thanks Roman!
    //begin Roman Black contribution
    // http://www.romanblack.com/integer_degree.htm
    // must include link to this website
    // Fast XY vector to integer degree algorithm - Jan 2011 www.RomanBlack.com
    // Converts any XY values including 0 to a degree value that should be
    // within +/- 1 degree of the accurate value without needing
    // large slow trig functions like ArcTan() or ArcCos().
    // NOTE! at least one of the X or Y values must be non-zero!
    // This is the full version, for all 4 quadrants and will generate
    // the angle in integer degrees from 0-360.
    // Any values of X and Y are usable including negative values provided
    // they are between -1456 and 1456 so the 16bit multiply does not overflow.

    x = x || 0;         // these hold the XY vector at the start
    y = y || 10;        // (and they will be destroyed)

    var negflag
      , tempdegree
      , comp
      , degree     // this will hold the result
      , ux
      , uy;

    // Save the sign flags then remove signs and get XY as unsigned ints
    negflag = 0;
    if(x < 0) {
      negflag += 0x01;    // x flag bit
      x = (0 - x);        // is now +
    }
    ux = x;                // copy to unsigned var before multiply
    if(y < 0) {
      negflag += 0x02;    // y flag bit
      y = (0 - y);        // is now +
    }
    uy = y;                // copy to unsigned var before multiply

    // 1. Calc the scaled "degrees"
    if(ux > uy) {
      degree = (uy * 45) / ux;   // degree result will be 0-45 range
      negflag += 0x10;    // octant flag bit
    } 
    else {
      degree = (ux * 45) / uy;   // degree result will be 0-45 range
    }

    // 2. Compensate for the 4 degree error curve
    comp = 0;
    tempdegree = degree;    // use an unsigned char for speed!
    if(tempdegree > 22) {   // if top half of range
      if(tempdegree <= 44) comp++;
      if(tempdegree <= 41) comp++;
      if(tempdegree <= 37) comp++;
      if(tempdegree <= 32) comp++;  // max is 4 degrees compensated
    }
    else {    // else is lower half of range
      if(tempdegree >= 2) comp++;
      if(tempdegree >= 6) comp++;
      if(tempdegree >= 10) comp++;
      if(tempdegree >= 15) comp++;  // max is 4 degrees compensated
    }
    degree += comp;   // degree is now accurate to +/- 1 degree!

    // Invert degree if it was X>Y octant, makes 0-45 into 90-45
    if(negflag & 0x10) {
      degree = (90 - degree);
    }

    // 3. Degree is now 0-90 range for this quadrant,
    // need to invert it for whichever quadrant it was in
    if(negflag & 0x02) {   // if -Y
      if(negflag & 0x01){   // if -Y -X
        degree = (180 + degree);
      }
      else{        // else is -Y +X
        degree = (180 - degree);
      }
    }
    else    // else is +Y
    {
      if(negflag & 0x01){   // if +Y -X
        degree = (360 - degree);
      }
    }
    return degree*radianConv;
    //end Roman Black contribution
  }



  //define the plugin action
  $.fn.jCircle = function( callback ) {
    //for each matched element, set the circular event handler to the provided callback
    $.each(this, function(i, elem){
      var smoothedRadian = 0
        , $elem = $(elem)
        //determine the center of the element, cache
        , circleCenterX = parseInt( $elem.height() / 2 )
        , circleCenterY = parseInt( $elem.width() / 2 )
        //helper functions convert cursor position to relative center of element
        , centerOffsetX = function(x){ return x - elem.offsetLeft - circleCenterX; }
        , centerOffsetY = function(y){ return -1 * (y - elem.offsetTop - circleCenterY); };
      
      //helpers to bind/unbind the mousemove action to the element
      var unbindMoveEvent = function( eventType )
        {
          console.log('UNbindMove event', eventType);
          $elem.unbind( eventType ); 
        }
        , bindMoveEvent = function( eventType )
        {
          console.log('bindmove event', eventType);
          var previousRadian = 0
            , previousTime = Number.NEGATIVE_INFINITY
            , moveEventCallback = function(e)
            {
              e.preventDefault();
              console.log('moving', e);
              console.log('pagex', e.pageX);
              // e.pageX e.pageY are from the edge of the document
              // we need relative to this element's center
              // get the radian of the current position
              var cursorRadian = romanblack( centerOffsetX(e.pageX), centerOffsetY(e.pageY) )
                , currentTime = window.performance.now()
                , direction = previousRadian < cursorRadian //clockwise == true
                , distance = cursorRadian - previousRadian
                , velocity = Math.abs(cursorRadian - previousRadian) / (currentTime - previousTime);
                
              // run the callback function only if we're really moving
              if(velocity > 0){
              
                smoothedRadian += distance;
                //range check and correction
                if(smoothedRadian < 0 || smoothedRadian >= radianMax){
                  smoothedRadian = (direction) ? 0 : radianMax;
                }
                
                //run the provided callback
                callback(cursorRadian, smoothedRadian, velocity, direction);
              }
              
              // save cursorRadian for next time
              previousRadian = cursorRadian;
              previousTime = currentTime;
            };
            
          //do the actual event binding
          $elem.bind( eventType, moveEventCallback );
        };
      
      // only do this stuff when mousedown, mouseenter, etc.
      // or, just bindMoveEvent(); to skip the mousedown event
      $elem.unbind('mousedown').bind('mousedown', function(){ bindMoveEvent('mousemove'); });
      $elem.unbind('mouseup').bind('mouseup', function(){ unbindMoveEvent('mousemove'); });
      //$elem.bind('mouseenter', bindMoveEvent);
      $elem.bind('mouseleave', unbindMoveEvent);

      $elem.bind('touchstart', function(){ bindMoveEvent('touchmove'); });
      $elem.bind('touchend', function(){ unbindMoveEvent('touchmove'); });
      $elem.bind('touchcancel', function(){ unbindMoveEvent('touchmove'); });
      $elem.bind('touchleave', function(){ unbindMoveEvent('touchmove'); });
//      $elem.bind('touchmove', bindMoveEvent);


    });
    return this;
  };
}(jQuery));

