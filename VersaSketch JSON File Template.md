# VersaSketch JSON File Template

Below is an example VersaSketch JSON template used to store image data.

```
{
    "filename":"sample.vsk",
    "width":1024,
    "height":768
    "layercount":3,
    "layers": [
        { 
            "name":"Layer0",
            "description": "Background layer",
            "data": "data:image/png;base64..."
        },
        { 
            "name":"Layer1",
            "description": "Highlight layer",
            "data": "data:image/png;base64..."
        },      
        { 
            "name":"Layer2",
            "description": "Drawing layer 1",
            "data": "data:image/png;base64..."
        }                                          
    ]
}
```
