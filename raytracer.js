var canvas = document.getElementById("canvas");
var canvas_context = canvas.getContext("2d");
var canvas_buffer = canvas_context.getImageData(0,0,canvas.width,canvas.height);
var canvas_pitch = canvas_buffer.width * 4;

//-------Low-Level------------------------

//PutPixel() Function
var PutPixel = function(x,y,color){
    x = canvas.width/2 + x;
    y = canvas.height/2 - y -1;

    if(x < 0 || x >= canvas.width || y < 0 || y >= canvas.height){
        return;
    }

    var offset = 4*x + canvas_pitch*y;
    canvas_buffer.data[offset++] = color[0];
    canvas_buffer.data[offset++] = color[1];
    canvas_buffer.data[offset++] = color[2];
    canvas_buffer.data[offset++] = 255; // Alpha = 255 (full opacity)
}

var UpdateCanvas = function(){
    canvas_context.putImageData(canvas_buffer,0,0);
}

//------------------------------------------

//-----------Linear Algebra---------------------------
var DotProduct = function(v1,v2){
    return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
}

var Length = function(vec){
    return Math.sqrt(DotProduct(vec,vec));
}

var Multiply = function(k,vec){
    return [k*vec[0],k*vec[1],k*vec[2]];
}

var Add = function(v1,v2){
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

var Subtract = function(v1,v2){
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

var Clamp = function(vec){
    return [Math.min(255,Math.max(0,vec[0])),
        Math.min(255,Math.max(0,vec[1])),
        Math.min(255,Math.max(0,vec[2]))];
}

//-----------------------------------------------------

//--------------Raytracer------------------------------

//Sphere generator
var Sphere = function(center,radius,color){
    this.center = center;
    this.radius = radius;
    this.color = color;
}

var Light = function(lighttype,intensity,position){
    this.lighttype = lighttype;
    this.intensity = intensity;
    this.position = position;
}

Light.AMBIENT = 0;
Light.POINT = 1;
Light.DIRECTIONAL = 2;

//Scene startup
var viewport_size = 1;
var projection_plane_z = 1;
var camera_position = [0,0,0];
var background_color = [255,255,255];
var spheres = [];
/*[new Sphere([0,-1,3],1,[255,0,0]),
            new Sphere([2,0,4],1,[0,0,255]),
            new Sphere([-2,0,4],1,[0,255,0])]*/

var lights = [
    new Light(Light.AMBIENT,0.2),
    new Light(Light.POINT,0.6,[2,1,0]),
    new Light(Light.DIRECTIONAL,0.2,[1,4,4])
];



var addsphere = function(){
    var x = document.getElementById("x").value;
    var y = document.getElementById("y").value;
    var z = document.getElementById("z").value;
    var r = document.getElementById("radius").value/100;
    var colorform = document.getElementById("color");
    var selected_color = colorform.selectedIndex;


    switch(selected_color){
        case 0: {var color = [0,255,0]; break;}
        case 1: {var color = [255,0,0]; break;}
        case 2: {var color = [0,0,255]; break;}
    }
    spheres.push(new Sphere([x,y,z],r,color));
    console.log(spheres);
    main();

}

//Coordinate Convertion
var CanvasToViewport = function(p2d){
    return [p2d[0] * viewport_size/canvas.width,
        p2d[1] * viewport_size/canvas.height,
        projection_plane_z];
}

//Intersection of Ray and Sphere. Returns t.
var IntersectRaySphere = function(origin,direction,sphere){
    var oc = Subtract(origin,sphere.center);

    var a = DotProduct(direction,direction);
    var b = 2*DotProduct(oc,direction);
    var c = DotProduct(oc,oc) - sphere.radius*sphere.radius;

    var discriminant = b*b - 4*a*c;
    if(discriminant < 0){
        return[Infinity,Infinity];
    }

    var t1 = (-b + Math.sqrt(discriminant)) / (2*a);
    var t2 = (-b - Math.sqrt(discriminant)) / (2*a);
    return [t1,t2];
}

var ComputeLighting = function(point,normal){
    var intensity = 0;
    var length_n = Length(normal);

    for(var i = 0; i < lights.length;i++){
        var light = lights[i];
        if(light.lighttype == Light.AMBIENT){
            intensity += light.intensity;
        } else {
            var vec_l;
            if(light.lighttype == Light.POINT){
                vec_l = Subtract(light.position,point);
            } else {
                vec_l = light.position;
            }

            var n_dot_l = DotProduct(normal,vec_l);
            if(n_dot_l > 0){
                intensity += light.intensity * n_dot_l/(length_n*Length(vec_l));
            }
        }
    }
    return intensity;
}

//Get closest Sphere color for set of Spheres
var TraceRay = function(origin,direction,min_t,max_t){
    var closest_t = Infinity;
    var closest_sphere = null;


    for(var i = 0; i < spheres.length;i++){
        var ts = IntersectRaySphere(origin,direction,spheres[i]);
        if(ts[0] < closest_t && min_t < ts[0] && ts[0] < max_t){
            closest_t = ts[0];
            closest_sphere = spheres[i];
        }

        if (ts[1] < closest_t && min_t < ts[1] && ts[1] < max_t) {
            closest_t = ts[1];
            closest_sphere = spheres[i];
          }

    }

    if(closest_sphere == null){
        return background_color;
    }

    var point = Add(origin,Multiply(closest_t,direction));
    var normal = Subtract(point,closest_sphere.center);
    normal = Multiply(1.0/Length(normal),normal);

    return Multiply(ComputeLighting(point,normal),closest_sphere.color);

}


var main = function(){
//Main Loop
for(var x = -canvas.width/2; x < canvas.width/2; x++){
    for(var y = -canvas.height/2; y < canvas.width/2;y++){
        var direction = CanvasToViewport([x,y]);
        var color = TraceRay(camera_position,direction,1,Infinity);
        PutPixel(x,y,Clamp(color));
        }
    }
    UpdateCanvas();
}

main();

