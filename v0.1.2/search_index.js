var documenterSearchIndex = {"docs":
[{"location":"intro/#WGPUCompute","page":"Home","title":"WGPUCompute","text":"","category":"section"},{"location":"intro/","page":"Home","title":"Home","text":"(Image: Stable) (Image: Dev) (Image: Build Status) (Image: Coverage)","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":":warning: This repo is under heavy development.","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"WGPUCompute is a WGPU compute shader utility library for julia. Using this library one can define compute shader kernels in regular julia. For example:","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"\nusing BenchmarkTools \nusing WGPUCompute\n\n# Kernel definition\nfunction cast_kernel(x::WgpuArray{T, N}, out::WgpuArray{S, N}) where {T, S, N}\n\txdim = workgroupDims.x\n\tydim = workgroupDims.y\n\tgIdx = workgroupId.x*xdim + localId.x\n\tgIdy = workgroupId.y*ydim + localId.y\n\tgId = xDims.x*gIdy + gIdx\n\tout[gId] = S(ceil(x[gId]))\nend\n\n# wrapper function\nfunction cast(S::DataType, x::WgpuArray{T, N}) where {T, N}\n\ty = WgpuArray{S}(undef, size(x))\n\t@wgpukernel launch=true workgroupSizes=(4, 4) workgroupCount=(2, 2) shmem=() cast_kernel(x, y)\n\treturn y\nend\n\nx = WgpuArray{Float32}(rand(Float32, 8, 8) .- 0.5f0)\nz = cast(UInt32, x)\n","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"In the above example single generalized kernel can be used for casting different datatypes. The type parameters S, T, & N are inferred and replaced with their actual type information internally.","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"Compute kernels also support defining shared memory and can provide means to implement kernels like matmul. For example","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"function tiled_matmul_kernel(x::WgpuArray{T, N}, y::WgpuArray{T, N}, out::WgpuArray{T, N}) where {T, N}\n\t#set out matrix to zero\n\tgId = xDims.x*globalId.y + globalId.x\n\tout[gId] = 0.0\n\t\n\t# set local variable = 0.0\n\tsum = 0.0\n\t\n\tfor tileId in 0:numWorkgroups.y\n\t\t# copy block from x to shared memory\n\t\txId = workgroupId.x*workgroupDims.x + localId.x\n\t\tyId = tileId*workgroupDims.y + localId.y\n\t\tsId = localId.y*workgroupDims.x + localId.x\n\t\tshmem1[sId] = x[yId*xDims.x + xId]\n\t\t\n\t\t# copy block from y to shared memory\n\t\txId = tileId*workgroupDims.x + localId.x\n\t\tyId = workgroupId.y*workgroupDims.y + localId.y\n\t\tshmem2[sId] = y[yId*yDims.x + xId]\n\t\tsynchronize()\n\t\t\t\t\n\t\t# block sums for each tid\n\t\tfor i in 0:xDims.y/numWorkgroups.y\n\t\t\tsum = sum + shmem1[i*workgroupDims.x + localId.x]*shmem2[localId.y*workgroupDims.x + i]\n\t\tend\n\t\tsynchronize()\n\tend\n\t\n\tout[gId] = sum\nend\n\n# For now valid only for square matrices of size powers of 2 and base size 16 to keep it simple.\nfunction tiled_matmul_heuristics(x::WgpuArray{T, N}, y::WgpuArray{T, N}) where {T, N}\n\taSize = size(x)\n\tbSize = size(y)\n\t@assert last(aSize) == first(bSize)\n\toutSize = (first(aSize), last(bSize))\n\t@assert eltype(x) == eltype(y)\n\twgSize = (16, 16) # This can be fixed for now\n\twgCount = div.((outSize[1], outSize[2]), 16, RoundUp)\n\treturn (outSize, wgSize, wgCount)\nend\n\nfunction tiled_matmul(x::WgpuArray{T, N}, y::WgpuArray{T, N}) where {T, N}\n\t(outSize, wgSize, wgCount) = tiled_matmul_heuristics(x, y)\n\tout = WgpuArray{eltype(x), ndims(x)}(undef, outSize)\n\t@wgpukernel(\n\t\tlaunch=true,\n\t\tworkgroupSizes=wgSize,\n\t\tworkgroupCount=wgCount,\n\t\tshmem=(:shmem1=>(Float32, wgSize), :shmem2=>(Float32, wgSize)),\n\t\ttiled_matmul_kernel(x, y, out)\n\t)\n\treturn out\nend\n\nBase.:*(x::WgpuArray{T, N}, y::WgpuArray{T, N})  where {T, N} = tiled_matmul(x, y)\n\nx = WgpuArray{Float32, 2}(rand(2048, 2048));\ny = WgpuArray{Float32, 2}(rand(2048, 2048));\n\nz = x*y\n\nz_cpu = (x |> collect)*(y |> collect)\n\n@test z_cpu ≈ (z |> collect)\n\n\n","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"There is limited supported for GPUArrays interface. And is currently under development to make is complete.","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"using WGPUCompute\nusing BenchmarkTools\n\naArray = WgpuArray{Float32}(undef, (1024, 1024, 100)) \nbArray = WgpuArray{Float32}(rand(Float32, (1024, 1024, 100)))\n\n@benchmark copyto!(aArray, 1, bArray, 1, prod(size(aArray)))\n","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"BenchmarkTools.Trial: 10000 samples with 1 evaluation.\n Range (min … max):  62.900 μs …  1.885 ms  ┊ GC (min … max): 0.00% … 0.00%\n Time  (median):     70.100 μs              ┊ GC (median):    0.00%\n Time  (mean ± σ):   95.964 μs ± 80.628 μs  ┊ GC (mean ± σ):  0.00% ± 0.00%\n\n   ▇█▄▃▁▁▃▃▂▂▂▂▂▂▁▂▂▁▁  ▁▂▃▂  ▁▁▂▃▃▂  ▁▂▁▂▁                   ▂\n  █████████████████████████████████████████▇▆▆▅▅▅▇█▇▆▆▇▇▇▆▅▆▆ █\n  62.9 μs      Histogram: log(frequency) by time       208 μs <\n\n Memory estimate: 1.01 KiB, allocs estimate: 37.\n ```\n\nBasic ML kernels can be defined:\n\nA very simplified kernel example of ML primitive `relu`:\n","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"julia using WGPUCompute","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"y = WgpuArray((rand(4, 4) .-0.5) .|> Float32)","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"function relu_kernel(x::WgpuArray{T, N}, out::WgpuArray{T, N}) where {T, N} \tgId = xDims.x*globalId.y + globalId.x \tvalue = x[gId] \tout[gId] = max(value, 0.0) end","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"function relu(x::WgpuArray{T, N}) where {T, N} \ty = similar(x) \t@wgpukernel launch=true workgroupSizes=(4,4) workgroupCount=(1,1) shmem=() relu_kernel(x, y) \treturn y end","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"relu(y)","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"\nThe above kernel undergoes two transformations:\n1. First the `@wgpukernel` kernel macro takes the kernel function and transforms into an custom AST and intermeditate representation. This transformation is actually carried out the work done in `WGPUTranspiler`. And this AST is again transpiled to the below format. This is very close to `WGSL` but with julia IR semantics. For more detailed explanation please browse to this [link](https://github.com/JuliaWGPU/WGPUTranspier.jl).","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"┌ Info: begin │     @const workgroupDims = Vec3{UInt32}(0x00000004, 0x00000004, 0x00000001) │     @const xDims = Vec3{UInt32}(0x00000004, 0x00000004, 0x00000001) │     @const outDims = Vec3{UInt32}(0x00000004, 0x00000004, 0x00000001) │     @var StorageReadWrite 0 0 x::Array{Float32, 16} │     @var StorageReadWrite 0 1 out::Array{Float32, 16} │     @compute @workgroupSize(4, 4, 1) function relukernel(@builtin(globalinvocationid, globalId::Vec3{UInt32}), @builtin(localinvocationid, localId::Vec3{UInt32}), @builtin(numworkgroups, numWorkgroups::Vec3{UInt32}), @builtin(workgroup_id, workgroupId::Vec3{UInt32})) │             @let gId = xDims.x * globalId.y + globalId.x │             @let value = x[gId] │             out[gId] = max(value, 0.0f0) │         end └ end","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"2. Then this representation is again compiled to webgpu/WGPU's representation, `WGSL`. This is carried out an another package called `WGSLTypes`. \n","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"┌ Info: const workgroupDims = vec3<u32>(4u, 4u, 1u); │ const xDims = vec3<u32>(4u, 4u, 1u); │ const outDims = vec3<u32>(4u, 4u, 1u); │ @group(0) @binding(0) var<storage, readwrite> x:array<f32, 16> ; │ @group(0) @binding(1) var<storage, readwrite> out:array<f32, 16> ; │ @compute @workgroupsize(4, 4, 1)  │ fn relukernel(@builtin(globalinvocationid) globalId:vec3<u32>, @builtin(localinvocationid) localId:vec3<u32>, @builtin(numworkgroups) numWorkgroups:vec3<u32>, @builtin(workgroupid) workgroupId:vec3<u32>) {  │     let gId = xDims.x * globalId.y + globalId.x; │     let value = x[gId]; │     out[gId] = max(value, 0.0); │ } └  ```","category":"page"},{"location":"intro/","page":"Home","title":"Home","text":"This final shader code is compiled using naga, WGPU-native's compiler.","category":"page"},{"location":"intro/#Conventions","page":"Home","title":"Conventions","text":"","category":"section"},{"location":"intro/","page":"Home","title":"Home","text":"Input arguments are converted into storage variables and placed at the top of the shader code.\nSize of input arguments are converted into const variables and placed at the top of the shader code. Users can use these arguments to probe for input arrays's size. The corresponding name of variable declaring size of array will be  a concatenation of variable name followed by \"Dims\". For example: if variable is x, xDims holds the size information.  \nKernel arguments like workgroupDims etc are also placed at the top of the shader code and can be used as an variables inside kernel code. This will eventually be probed using julia's size function. Until then we can use this convention.\nShared memory can be declared in the @wgpukernel macro using shmem kwarg. shmem expects a tuple of pairs with each pair representing name and (type, size) of shared memory. Example: shmem = (\"xShared\"=>(Float32, 16))","category":"page"},{"location":"intro/#Known-issues","page":"Home","title":"Known issues","text":"","category":"section"},{"location":"intro/","page":"Home","title":"Home","text":"jupyter notebooks are not tested yet and might need some work to have compatibility with pluto as well.","category":"page"},{"location":"intro/#TODO","page":"Home","title":"TODO","text":"","category":"section"},{"location":"intro/","page":"Home","title":"Home","text":"[ ] atomics support is under development.\n[ ] possibility of JSServe the generated wgsl code in web app.\n[ ] Complete SPIRV version\n[ ] Explore and adhere to Binary generation eventually. ","category":"page"},{"location":"","page":"API","title":"API","text":"CurrentModule = WGPUCompute","category":"page"},{"location":"#WGPUCompute","page":"API","title":"WGPUCompute","text":"","category":"section"},{"location":"","page":"API","title":"API","text":"Documentation for WGPUCompute.","category":"page"},{"location":"","page":"API","title":"API","text":"","category":"page"},{"location":"","page":"API","title":"API","text":"Modules = [WGPUCompute]","category":"page"},{"location":"#WGPUCompute.cast-Union{Tuple{N}, Tuple{T}, Tuple{DataType, WgpuArray{T, N}}} where {T, N}","page":"API","title":"WGPUCompute.cast","text":"cast(S::DataType, x::WgpuArray{T, N}) where {T, N}\n\nThis is a wrapper function for cast_kernel kernel function. This is meant  for users to cast from regular julia functions.\n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.cast_kernel-Union{Tuple{N}, Tuple{S}, Tuple{T}, Tuple{WgpuArray{T, N}, WgpuArray{S, N}}} where {T, S, N}","page":"API","title":"WGPUCompute.cast_kernel","text":"cast_kernel(x::WgpuArray{T, N}, out::WgpuArray{S, N}) where {T, S, N}\n\nThis is a compute kernel which casts the x array of eltype T to eltype S. Users are not supposed to use this function call from julia. This instead needs to  be wrapped with an additional function which uses @wgpukernel macro call to convert the julia function definition to a equivalent WGPU kernel function.\n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.clamp-Union{Tuple{N}, Tuple{T}, Tuple{WgpuArray{T, N}, T, T}} where {T, N}","page":"API","title":"WGPUCompute.clamp","text":"clamp(x::WgpuArray{T, N}, minValue::T, maxValue::T) where {T, N}\n\nThis is a clamp operator which takes WgpuArray as an input along with lower bound and upper bound clamp values to clamp the input array to these bounds\n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.matmul-Union{Tuple{N}, Tuple{T}, Tuple{WgpuArray{T, N}, WgpuArray{T, N}}} where {T, N}","page":"API","title":"WGPUCompute.matmul","text":"matmul(x::WgpuArray{T, N}, y::WgpuArray{T, N}) where {T, N}\n\nThis is wrapper function for end users which uses naive implementation of matrix multiplication  naive_matmul_kernel kernel for matrix computation. \n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.matmul_heuristics-Tuple{Any, Any}","page":"API","title":"WGPUCompute.matmul_heuristics","text":"matmul_heuristics(x, y)\n\nThis function computes workgroup size and workgroup count heuristics for a given input. This is used by naive_matmul_kernel.\n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.naive_matmul_kernel-Union{Tuple{N}, Tuple{T}, Tuple{WgpuArray{T, N}, WgpuArray{T, N}, WgpuArray{T, N}}} where {T, N}","page":"API","title":"WGPUCompute.naive_matmul_kernel","text":"naive_matmul_kernel(x::WgpuArray{T, N}, y::WgpuArray{T, N}, out::WgpuArray{T, N}) where {T, N}\n\nThis is naive matrix multiplication implementation kernel. This is not supposed to be used as a regular julia function. This needs to be passed to @wgpukernel to under transformations to WGSL compatible shader code.\n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.tiled_matmul-Union{Tuple{N}, Tuple{T}, Tuple{WgpuArray{T, N}, WgpuArray{T, N}}} where {T, N}","page":"API","title":"WGPUCompute.tiled_matmul","text":"tiled_matmul(x::WgpuArray{T, N}, y::WgpuArray{T, N}) where {T, N}\n\nThis is user end matrix multiplication function which carries out tiled matrix multiplication of input WgpuArray arguments.\n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.tiled_matmul_heuristics-Union{Tuple{N}, Tuple{T}, Tuple{WgpuArray{T, N}, WgpuArray{T, N}}} where {T, N}","page":"API","title":"WGPUCompute.tiled_matmul_heuristics","text":"tiled_matmul_heuristics(x::WgpuArray{T, N}, y::WgpuArray{T, N}) where {T, N}\n\nThis function computes workgroup size and workgroup count for a given input for tiled_matmul_heuristics kernel function.\n\n\n\n\n\n","category":"method"},{"location":"#WGPUCompute.tiled_matmul_kernel-Union{Tuple{N}, Tuple{T}, Tuple{WgpuArray{T, N}, WgpuArray{T, N}, WgpuArray{T, N}}} where {T, N}","page":"API","title":"WGPUCompute.tiled_matmul_kernel","text":"tiled_matmul_kernel(x::WgpuArray{T, N}, y::WgpuArray{T, N}, out::WgpuArray{T, N}) where {T, N}\n\nThis is compute kernel which carries out tiled matrix multiplication of input WgpuArrays. This is  not supposed to be used as a regular julia function. This instead needs to be passed to @wgpukernel macro inside a wrapper function.\n\n\n\n\n\n","category":"method"}]
}
