import { CollectibleTypeEnum, CollectibleType } from "LLD/Collectibles/types/Collectibles";
import { PanAndZoomProps, DetailDrawerProps } from "LLD/Collectibles/types/DetailDrawer";
import { MediaProps } from "LLD/Collectibles/types/Media";
import { NftComponentData } from "LLD/Collectibles/types/Nfts";

function isNftData(data: unknown): data is NftComponentData {
  return Boolean(data) && typeof (data as NftComponentData).collectionName === "string";
}

export function createCollectibleObject(type: CollectibleType, data: unknown) {
  if (type === CollectibleTypeEnum.NFT) {
    if (isNftData(data)) {
      return {
        type: CollectibleTypeEnum.NFT,
        mediaProps: <MediaProps>{
          collectibleName: data.nftName,
          contentType: data.contentType,
          mediaType: data.mediaType,
          tokenId: data.tokenId,
          uri: data.imageUri,
          useFallback: data.useFallback,
          squareWithDefault: false,
          setUseFallback: data.setUseFallback,
        },
        panAndZoomProps: <PanAndZoomProps>{
          collectibleName: data.nftName,
          contentType: data.contentType,
          imageUri: data.imageUri,
          mediaType: data.mediaType,
          tokenId: data.tokenId,
          useFallback: data.useFallback,
          onClose: data.closeCollectiblesPanAndZoom,
          setUseFallback: data.setUseFallback,
        },
        other: {},
      };
    } else {
      throw new Error("Invalid data for NFT");
    }
  }

  if (type === CollectibleTypeEnum.Ordinal) {
    return {
      detailDrawerProps: <DetailDrawerProps>{
        isOpened: false,
      },
      mediaProps: <MediaProps>{},
      panAndZoomProps: <PanAndZoomProps>{},
    };
  }

  return {
    detailDrawerProps: <DetailDrawerProps>{
      isOpened: false,
    },
    mediaProps: <MediaProps>{},
    panAndZoomProps: <PanAndZoomProps>{},
  };
}
