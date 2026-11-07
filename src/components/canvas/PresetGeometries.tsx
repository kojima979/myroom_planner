import React, { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import { FurnitureItem } from '../../types/room';

type Props = {
  item: FurnitureItem;
  isSelected: boolean;
  isColliding: boolean;
};

/**
 * 外部3Dモデル（GLTF / GLB / OBJ）を読み込み、指定されたdimensions（幅・高さ・奥行き）に自動スケーリングして描画する
 */
const CustomModelRenderer: React.FC<{
  dataUrl: string;
  format: 'gltf' | 'glb' | 'obj';
  dimensions: { width: number; height: number; depth: number };
  isColliding: boolean;
}> = ({ dataUrl, format, dimensions, isColliding }) => {
  const [loadedObject, setLoadedObject] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (format === 'obj') {
      const loader = new OBJLoader();
      loader.load(
        dataUrl,
        (obj) => {
          if (isMounted) setLoadedObject(obj);
        },
        undefined,
        (err) => {
          console.error('OBJ load error:', err);
        }
      );
    } else {
      const loader = new GLTFLoader();
      loader.load(
        dataUrl,
        (gltf) => {
          if (isMounted) setLoadedObject(gltf.scene);
        },
        undefined,
        (err) => {
          console.error('GLTF/GLB load error:', err);
        }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [dataUrl, format]);

  const normalizedGroup = useMemo(() => {
    if (!loadedObject) return null;
    const clone = loadedObject.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const scaleX = size.x > 1e-4 ? dimensions.width / size.x : 1;
    const scaleY = size.y > 1e-4 ? dimensions.height / size.y : 1;
    const scaleZ = size.z > 1e-4 ? dimensions.depth / size.z : 1;

    clone.position.set(-center.x * scaleX, -box.min.y * scaleY, -center.z * scaleZ);
    clone.scale.set(scaleX, scaleY, scaleZ);

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (isColliding && child.material) {
          const mat = (child.material as THREE.Material).clone();
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive = new THREE.Color('#ef4444');
            mat.emissiveIntensity = 0.45;
          }
          child.material = mat;
        }
      }
    });

    return clone;
  }, [loadedObject, dimensions.width, dimensions.height, dimensions.depth, isColliding]);

  if (!normalizedGroup) {
    return (
      <mesh position={[0, dimensions.height / 2, 0]}>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial color="#94a3b8" wireframe />
      </mesh>
    );
  }

  return <primitive object={normalizedGroup} />;
};

export const PresetGeometryRenderer: React.FC<Props> = ({
  item,
  isSelected,
  isColliding,
}) => {
  const { width: w, height: h, depth: d } = item.dimensions;
  const baseColor = isColliding ? '#ef4444' : item.color;
  const emissiveColor = isColliding ? '#dc2626' : isSelected ? '#38bdf8' : '#000000';
  const emissiveIntensity = isColliding ? 0.4 : isSelected ? 0.18 : 0;

  // 扉の開閉軌跡アーク（平面視用）
  const doorSwingPoints = useMemo(() => {
    if (item.presetType !== 'door') return [];
    const pts: Array<[number, number, number]> = [];
    const segments = 24;
    const radius = w * 0.9;
    const hingeX = -w / 2;
    const hingeZ = d / 2;
    pts.push([hingeX, 5, hingeZ]);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * (Math.PI / 2);
      const px = hingeX + Math.cos(angle) * radius;
      const pz = hingeZ + Math.sin(angle) * radius;
      pts.push([px, 5, pz]);
    }
    return pts;
  }, [item.presetType, w, d]);

  switch (item.presetType) {
    case 'bed': {
      const frameH = Math.min(h * 0.38, 220);
      const mattressH = Math.min(h * 0.35, 220);
      const headboardT = Math.min(d * 0.06, 100);
      const pillowW = Math.min(w * 0.38, 500);
      const pillowD = Math.min(d * 0.16, 320);
      const pillowH = Math.max(40, h * 0.12);

      return (
        <group>
          {/* ベッドフレーム */}
          <mesh position={[0, frameH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, frameH, d]} />
            <meshStandardMaterial
              color="#78350f"
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.7}
            />
          </mesh>
          {/* ヘッドボード */}
          <mesh position={[0, h / 2, -d / 2 + headboardT / 2]} castShadow receiveShadow>
            <boxGeometry args={[w, h, headboardT]} />
            <meshStandardMaterial
              color="#78350f"
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.7}
            />
          </mesh>
          {/* マットレス（シーツ） */}
          <mesh
            position={[0, frameH + mattressH / 2, headboardT / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w * 0.96, mattressH, d - headboardT]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.85}
            />
          </mesh>
          {/* 掛け布団 */}
          <mesh
            position={[0, frameH + mattressH + 12, d * 0.12]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w * 0.97, 28, d * 0.68]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
            />
          </mesh>
          {/* 枕 */}
          <mesh
            position={[
              0,
              frameH + mattressH + pillowH / 2,
              -d / 2 + headboardT + pillowD * 0.75,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[pillowW, pillowH, pillowD]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
          </mesh>
        </group>
      );
    }

    case 'desk': {
      const topThickness = Math.min(40, h * 0.08);
      const legThickness = Math.min(50, w * 0.08, d * 0.1);
      const legH = Math.max(10, h - topThickness);
      const offsetX = w / 2 - legThickness / 2 - 15;
      const offsetZ = d / 2 - legThickness / 2 - 15;

      return (
        <group>
          {/* 天板 */}
          <mesh position={[0, h - topThickness / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, topThickness, d]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.5}
            />
          </mesh>
          {/* 4本脚 */}
          {[
            [-offsetX, -offsetZ],
            [offsetX, -offsetZ],
            [-offsetX, offsetZ],
            [offsetX, offsetZ],
          ].map(([lx, lz], idx) => (
            <mesh key={idx} position={[lx, legH / 2, lz]} castShadow receiveShadow>
              <boxGeometry args={[legThickness, legH, legThickness]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
          ))}
        </group>
      );
    }

    case 'chair': {
      const seatY = h * 0.52;
      const seatThickness = Math.max(30, h * 0.06);
      const backH = h - seatY;
      const legT = Math.min(35, w * 0.09);
      const ox = w / 2 - legT;
      const oz = d / 2 - legT;

      return (
        <group>
          {/* 座面 */}
          <mesh position={[0, seatY, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, seatThickness, d]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.65}
            />
          </mesh>
          {/* 背もたれ */}
          <mesh
            position={[0, seatY + backH / 2, -d / 2 + legT / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w * 0.92, backH, legT]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.65}
            />
          </mesh>
          {/* 4本脚 */}
          {[
            [-ox, -oz],
            [ox, -oz],
            [-ox, oz],
            [ox, oz],
          ].map(([lx, lz], idx) => (
            <mesh key={idx} position={[lx, seatY / 2, lz]} castShadow receiveShadow>
              <boxGeometry args={[legT, seatY, legT]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
          ))}
        </group>
      );
    }

    case 'sofa': {
      const seatH = h * 0.45;
      const armW = Math.min(160, w * 0.14);
      const armH = h * 0.68;
      const backD = Math.min(200, d * 0.25);

      return (
        <group>
          {/* 座面ベース */}
          <mesh position={[0, seatH / 2, backD / 4]} castShadow receiveShadow>
            <boxGeometry args={[w - armW * 2, seatH, d - backD / 2]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
            />
          </mesh>
          {/* 背もたれ */}
          <mesh position={[0, h / 2, -d / 2 + backD / 2]} castShadow receiveShadow>
            <boxGeometry args={[w, h, backD]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
            />
          </mesh>
          {/* 左アームレスト */}
          <mesh position={[-w / 2 + armW / 2, armH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[armW, armH, d]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
            />
          </mesh>
          {/* 右アームレスト */}
          <mesh position={[w / 2 - armW / 2, armH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[armW, armH, d]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
            />
          </mesh>
        </group>
      );
    }

    case 'bookshelf': {
      const boardT = Math.min(24, w * 0.05);
      const shelfCount = Math.max(2, Math.min(6, Math.floor(h / 340)));
      const shelves = Array.from({ length: shelfCount + 1 }, (_, i) =>
        boardT / 2 + (i * (h - boardT)) / shelfCount
      );

      return (
        <group>
          {/* 背板 */}
          <mesh position={[0, h / 2, -d / 2 + 8]} castShadow receiveShadow>
            <boxGeometry args={[w, h, 16]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.7}
            />
          </mesh>
          {/* 左側板 */}
          <mesh position={[-w / 2 + boardT / 2, h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[boardT, h, d]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.65}
            />
          </mesh>
          {/* 右側板 */}
          <mesh position={[w / 2 - boardT / 2, h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[boardT, h, d]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.65}
            />
          </mesh>
          {/* 各段の棚板 */}
          {shelves.map((sy, idx) => (
            <mesh key={idx} position={[0, sy, 0]} castShadow receiveShadow>
              <boxGeometry args={[w - boardT * 2, boardT, d - 10]} />
              <meshStandardMaterial
                color={baseColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                roughness={0.65}
              />
            </mesh>
          ))}
        </group>
      );
    }

    case 'carpet': {
      const carpetH = Math.max(4, h);
      return (
        <group>
          <mesh position={[0, carpetH / 2, 0]} receiveShadow>
            <boxGeometry args={[w, carpetH, d]} />
            <meshStandardMaterial
              color={item.color}
              emissive={isSelected ? '#38bdf8' : '#000000'}
              emissiveIntensity={isSelected ? 0.2 : 0}
              roughness={0.95}
            />
          </mesh>
          {/* カーペットの縁取りライン */}
          <Line
            points={[
              [-w / 2, carpetH + 1, -d / 2],
              [w / 2, carpetH + 1, -d / 2],
              [w / 2, carpetH + 1, d / 2],
              [-w / 2, carpetH + 1, d / 2],
              [-w / 2, carpetH + 1, -d / 2],
            ]}
            color={isSelected ? '#38bdf8' : '#f8fafc'}
            lineWidth={1.5}
          />
        </group>
      );
    }

    case 'window': {
      const frameT = Math.min(50, w * 0.06, h * 0.06);
      return (
        <group>
          {/* 外枠 */}
          <mesh position={[0, frameT / 2, 0]}>
            <boxGeometry args={[w, frameT, d]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
          <mesh position={[0, h - frameT / 2, 0]}>
            <boxGeometry args={[w, frameT, d]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
          <mesh position={[-w / 2 + frameT / 2, h / 2, 0]}>
            <boxGeometry args={[frameT, h, d]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
          <mesh position={[w / 2 - frameT / 2, h / 2, 0]}>
            <boxGeometry args={[frameT, h, d]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
          {/* 中央サッシ */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[frameT * 0.7, h - frameT * 2, d * 0.8]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          {/* ガラス面 */}
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w - frameT * 2, h - frameT * 2, Math.max(12, d * 0.25)]} />
            <meshStandardMaterial
              color={baseColor}
              transparent
              opacity={0.45}
              roughness={0.1}
              metalness={0.2}
            />
          </mesh>
        </group>
      );
    }

    case 'door': {
      const frameT = 45;
      return (
        <group>
          {/* ドア枠 */}
          <mesh position={[-w / 2 + frameT / 2, h / 2, 0]} castShadow>
            <boxGeometry args={[frameT, h, d]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[w / 2 - frameT / 2, h / 2, 0]} castShadow>
            <boxGeometry args={[frameT, h, d]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, h - frameT / 2, 0]} castShadow>
            <boxGeometry args={[w, frameT, d]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          {/* ドアパネル */}
          <mesh position={[0, (h - frameT) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - frameT * 2, h - frameT, Math.max(40, d * 0.45)]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.6}
            />
          </mesh>
          {/* ドアノブ */}
          <mesh position={[w * 0.3, h * 0.48, d * 0.35]}>
            <sphereGeometry args={[28, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[w * 0.3, h * 0.48, -d * 0.35]}>
            <sphereGeometry args={[28, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* 開閉軌跡ガイド（床面） */}
          {doorSwingPoints.length > 1 && (
            <Line
              points={doorSwingPoints}
              color="#fbbf24"
              lineWidth={1.5}
              dashed
              dashSize={60}
              gapSize={40}
            />
          )}
        </group>
      );
    }

    case 'cylinder': {
      const radiusX = w / 2;
      const radiusZ = d / 2;
      return (
        <mesh
          position={[0, h / 2, 0]}
          scale={[1, 1, radiusZ / Math.max(1, radiusX)]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[radiusX, radiusX, h, 32]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.6}
          />
        </mesh>
      );
    }

    case 'custom_model': {
      if (item.modelDataUrl && item.modelFormat) {
        return (
          <Suspense
            fallback={
              <mesh position={[0, h / 2, 0]}>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color="#94a3b8" wireframe />
              </mesh>
            }
          >
            <CustomModelRenderer
              dataUrl={item.modelDataUrl}
              format={item.modelFormat}
              dimensions={item.dimensions}
              isColliding={isColliding}
            />
          </Suspense>
        );
      }
      return (
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={baseColor} />
        </mesh>
      );
    }

    case 'box':
    default: {
      return (
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.6}
          />
        </mesh>
      );
    }
  }
};
