/**
 * @file Axes Representation
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @private
 */


import { Color } from "../../lib/three.es6.js";

import { RepresentationRegistry } from "../globals.js";
import { defaults } from "../utils.js";
import { uniformArray, uniformArray3 } from "../math/array-utils.js";
import Representation from "./representation.js";
import StructureRepresentation from "./structure-representation.js";
import SphereBuffer from "../buffer/sphere-buffer.js";
import CylinderBuffer from "../buffer/cylinder-buffer.js";
import { Matrix, principalAxes } from "../math/matrix-utils.js";


function AxesRepresentation( structure, viewer, params ){

    StructureRepresentation.call( this, structure, viewer, params );

}

AxesRepresentation.prototype = Object.assign( Object.create(

    StructureRepresentation.prototype ), {

    constructor: AxesRepresentation,

    type: "axes",

    parameters: Object.assign( {

        radius: {
            type: "number", precision: 3, max: 10.0, min: 0.001
        },
        sphereDetail: {
            type: "integer", max: 3, min: 0, rebuild: "impostor"
        },
        radiusSegments: {
            type: "integer", max: 25, min: 5, rebuild: "impostor"
        },
        disableImpostor: {
            type: "boolean", rebuild: true
        }

    }, Representation.prototype.parameters, {
        assembly: null
    } ),

    init: function( params ){

        var p = params || {};

        p.radius = defaults( p.radius, 0.5 );
        p.colorValue = defaults( p.colorValue, "lightgreen" );

        if( p.quality === "low" ){
            this.sphereDetail = 0;
            this.radiusSegments = 5;
        }else if( p.quality === "medium" ){
            this.sphereDetail = 1;
            this.radiusSegments = 10;
        }else if( p.quality === "high" ){
            this.sphereDetail = 2;
            this.radiusSegments = 20;
        }else{
            this.sphereDetail = defaults( p.sphereDetail, 1 );
            this.radiusSegments = defaults( p.radiusSegments, 10 );
        }
        this.disableImpostor = defaults( p.disableImpostor, false );

        StructureRepresentation.prototype.init.call( this, p );

    },

    getAxesData: function( sview ){

        console.time( "getAxesData" );

        var i = 0;
        var coords = new Matrix( 3, sview.atomCount );
        var cd = coords.data;
        sview.eachSelectedAtom( function( a ){
            cd[ i + 0 ] = a.x;
            cd[ i + 1 ] = a.y;
            cd[ i + 2 ] = a.z;
            i += 3;
        } );
        var pa = principalAxes( coords );

        var c = new Color( this.colorValue );

        var vertexPosition = new Float32Array( 3 * 6 );
        var vertexColor = uniformArray3( 6, c.r, c.g, c.b );
        var vertexRadius = uniformArray( 6, this.radius );

        var edgePosition1 = new Float32Array( 3 * 3 );
        var edgePosition2 = new Float32Array( 3 * 3 );
        var edgeColor = uniformArray3( 3, c.r, c.g, c.b );
        var edgeRadius = uniformArray( 3, this.radius );

        var offset = 0;
        function addAxis( v1, v2 ){
            v1.toArray( vertexPosition, offset * 2 );
            v2.toArray( vertexPosition, offset * 2 + 3 );
            v1.toArray( edgePosition1, offset );
            v2.toArray( edgePosition2, offset );
            offset += 3;
        }

        addAxis( pa[ 0 ][ 0 ], pa[ 0 ][ 1 ] );
        addAxis( pa[ 1 ][ 0 ], pa[ 1 ][ 1 ] );
        addAxis( pa[ 2 ][ 0 ], pa[ 2 ][ 1 ] );

        console.timeEnd( "getAxesData" );

        return {
            vertexPosition: vertexPosition,
            vertexColor: vertexColor,
            vertexRadius: vertexRadius,
            edgePosition1: edgePosition1,
            edgePosition2: edgePosition2,
            edgeColor: edgeColor,
            edgeRadius: edgeRadius
        };

    },

    create: function(){

        var axesData = this.getAxesData( this.structureView );

        this.sphereBuffer = new SphereBuffer(
            axesData.vertexPosition,
            axesData.vertexColor,
            axesData.vertexRadius,
            undefined,
            this.getBufferParams( {
                sphereDetail: this.sphereDetail,
                disableImpostor: this.disableImpostor,
                dullInterior: true
            } )
        );

        this.cylinderBuffer = new CylinderBuffer(
            axesData.edgePosition1,
            axesData.edgePosition2,
            axesData.edgeColor,
            axesData.edgeColor,
            axesData.edgeRadius,
            undefined,
            undefined,
            this.getBufferParams( {
                shift: 0,
                cap: true,
                radiusSegments: this.radiusSegments,
                disableImpostor: this.disableImpostor,
                dullInterior: true
            } )
        );

        this.dataList.push( {
            sview: this.structureView,
            bufferList: [ this.sphereBuffer, this.cylinderBuffer ]
        } );

    },

    updateData: function( what, data ){

        var axesData = this.getAxesData( data.sview );
        var sphereData = {};
        var cylinderData = {};

        if( !what || what.position ){
            sphereData.position = axesData.vertexPosition;
            cylinderData.position1 = axesData.edgePosition1;
            cylinderData.position2 = axesData.edgePosition2;
        }

        if( !what || what.color ){
            sphereData.color = axesData.vertexColor;
            cylinderData.color = axesData.edgeColor;
            cylinderData.color2 = axesData.edgeColor;
        }

        if( !what || what.radius ){
            sphereData.radius = axesData.vertexRadius;
            cylinderData.radius = axesData.edgeRadius;
        }

        this.sphereBuffer.setAttributes( sphereData );
        this.cylinderBuffer.setAttributes( cylinderData );

    }

} );


RepresentationRegistry.add( "axes", AxesRepresentation );


export default AxesRepresentation;