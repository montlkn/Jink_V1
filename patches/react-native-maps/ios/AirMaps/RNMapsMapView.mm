//
//  RNMapsMapView.mm (guarded for classic arch)
//  Copied from react-native-maps and wrapped with RCT_NEW_ARCH_ENABLED
//

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import "RNMapsMapView.h"
#import "AIRMap.h"
#import "AIRMapMarker.h"
#import "AIRMapManager.h"
#import "RNMapsMarkerView.h"
#if __has_include(<ReactNativeMaps/generated/RNMapsAirModuleDelegate.h>)
#import <ReactNativeMaps/generated/RNMapsAirModuleDelegate.h>
#import <ReactNativeMaps/generated/RNMapsSpecs.h>
#import <ReactNativeMaps/generated/RNMapsHostViewDelegate.h>
#import <ReactNativeMaps/generated/ComponentDescriptors.h>
#import <ReactNativeMaps/generated/EventEmitters.h>
#import <ReactNativeMaps/generated/Props.h>
#import <ReactNativeMaps/generated/RCTComponentViewHelpers.h>
#else
#import "../generated/RNMapsAirModuleDelegate.h"
#import "../generated/RNMapsSpecs/RNMapsSpecs.h"
#import "../generated/RNMapsSpecs/ComponentDescriptors.h"
#import "../generated/RNMapsSpecs/EventEmitters.h"
#import "../generated/RNMapsSpecs/Props.h"
#import "../generated/RNMapsSpecs/RCTComponentViewHelpers.h"
#endif
#import "RCTFabricComponentsPlugins.h"
#import <React/RCTConversions.h>
#import "UIView+AirMap.h"

using namespace facebook::react;

@interface RNMapsMapView () <RCTRNMapsMapViewViewProtocol>
@end

@implementation RNMapsMapView {
    AIRMap *_view;
    AIRMapManager* _legacyMapManager;
}


- (id<RNMapsAirModuleDelegate>) mapView {
    return (id<RNMapsAirModuleDelegate>)_view;
}

- (void) prepareForRecycle
{
    [super prepareForRecycle];
    [_view removeFromSuperview];
    _view = nil;
    _legacyMapManager = nil;
    self.contentView = nil;
}

#pragma mark - JS Commands
- (void)animateToRegion:(NSString *)regionJSON duration:(NSInteger)duration{
    NSDictionary* regionDic = [RCTConvert dictonaryFromString:regionJSON];
    MKCoordinateRegion region = [RCTConvert MKCoordinateRegion:regionDic];
    Boolean animated = duration == 0 ? NO :YES;
    _view.ignoreRegionChanges = animated;
    [_view setRegion:region animated:animated];
}
- (void)setCamera:(NSString *)cameraJSON{
    NSDictionary* cameraDic = [RCTConvert dictonaryFromString:cameraJSON];
    MKMapCamera *camera = [RCTConvert MKMapCameraWithDefaults:cameraDic existingCamera:[_view camera]];
    [_view setCamera:camera];
}

- (void)animateCamera:(NSString *)cameraJSON duration:(NSInteger)duration{
    NSDictionary* cameraDic = [RCTConvert dictonaryFromString:cameraJSON];
    MKMapCamera *camera = [RCTConvert MKMapCameraWithDefaults:cameraDic existingCamera:[_view camera]];
    // don't emit region change events when we are setting the camera
    _view.ignoreRegionChanges = YES;
    [_view setCamera:camera animated:YES];
}

- (void)fitToElements:(NSString *)edgePaddingJSON animated:(BOOL)animated {
    [_view showAnnotations:_view.annotations animated:animated];
}

- (void)fitToSuppliedMarkers:(NSString *)markersJSON edgePaddingJSON:(NSString *)edgePaddingJSON animated:(BOOL)animated {
    NSArray* markers = [RCTConvert arrayFromString:markersJSON];
    NSPredicate *filterMarkers = [NSPredicate predicateWithBlock:^BOOL(id evaluatedObject, NSDictionary *bindings) {
        AIRMapMarker *marker = (AIRMapMarker *)evaluatedObject;
        return [marker isKindOfClass:[AIRMapMarker class]] && [markers containsObject:marker.identifier];
    }];
    NSArray *filteredMarkers = [_view.annotations filteredArrayUsingPredicate:filterMarkers];
    [_view showAnnotations:filteredMarkers animated:animated];
}
- (void)fitToCoordinates:(NSString *)coordinatesJSON edgePaddingJSON:(NSString *)edgePaddingJSON animated:(BOOL)animated {
    NSArray* coordinatesArr = [RCTConvert arrayFromString:coordinatesJSON];
    NSMutableArray<AIRMapCoordinate*>* mutableArray = [NSMutableArray new];
    for (id json : coordinatesArr){
        [mutableArray addObject:[RCTConvert AIRMapCoordinate:json]];
    }

    NSDictionary* edgePadding = [RCTConvert dictonaryFromString:edgePaddingJSON];

    UIEdgeInsets edgeInsets = [RCTConvert UIEdgeInsets:edgePadding];
    [_view fitToCoordinates:mutableArray edgePadding:edgeInsets animated:animated];

}

- (void) setIndoorActiveLevelIndex:(NSInteger) activeLevelIndex
{
    // do nothing (google only)
}

#pragma mark - Native commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
    RCTRNMapsMapViewHandleCommand(self, commandName, args);
}


+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<RNMapsMapViewComponentDescriptor>();
}

- (void) prepareMapView
{
    if (_legacyMapManager && _view) return;
    static const auto defaultProps = std::make_shared<const RNMapsMapViewProps>();
    _props = defaultProps;
    _legacyMapManager = [[AIRMapManager alloc] init];
    _view = (AIRMap *)[_legacyMapManager view];

    self.contentView = _view;

    _view.onLongPress = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            // Extract values from the NSDictionary
            NSDictionary* coordinateDict = dictionary[@"coordinate"];
            NSDictionary* positionDict = dictionary[@"position"];

            // Populate the OnMapPressCoordinate struct
            facebook::react::RNMapsMapViewEventEmitter::OnLongPressCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            // Populate the OnMapPressPosition struct
            facebook::react::RNMapsMapViewEventEmitter::OnLongPressPosition position = {
                .x = [positionDict[@"x"] doubleValue],
                .y = [positionDict[@"y"] doubleValue],
            };

            auto mapViewEventEmitter = std::static_pointer_cast<RNMapsMapViewEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMapViewEventEmitter::OnLongPress data = {
                .action = std::string([@"long-press" UTF8String]),
                .position = position,
                .coordinate = coordinate
            };
            mapViewEventEmitter->onLongPress(data);
        }
    };

    _view.onPress = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            // Extract values from the NSDictionary
            NSDictionary* coordinateDict = dictionary[@"coordinate"];
            NSDictionary* positionDict = dictionary[@"position"];

            // Populate the OnMapPressCoordinate struct
            facebook::react::RNMapsMapViewEventEmitter::OnPressCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            // Populate the OnMapPressPosition struct
            facebook::react::RNMapsMapViewEventEmitter::OnPressPosition position = {
                .x = [positionDict[@"x"] doubleValue],
                .y = [positionDict[@"y"] doubleValue],
            };

            auto mapViewEventEmitter = std::static_pointer_cast<RNMapsMapViewEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMapViewEventEmitter::OnPress data = {
                .action = std::string([@"press" UTF8String]),
                .position = position,
                .coordinate = coordinate
            };
            mapViewEventEmitter->onPress(data);
        }
    };

    _view.onMapReady = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {

            auto mapViewEventEmitter = std::static_pointer_cast<RNMapsMapViewEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMapViewEventEmitter::OnMapReady data = {};
            mapViewEventEmitter->onMapReady(data);
        }
    };
    _view.onRegionChange = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            NSDictionary* regionDict = dictionary[@"region"];
            auto mapViewEventEmitter = std::static_pointer_cast<RNMapsMapViewEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMapViewEventEmitter::OnRegionChange data = {
                .region.latitude = [regionDict[@"latitude"] doubleValue],
                .region.longitude = [regionDict[@"longitude"] doubleValue],
                .region.latitudeDelta = [regionDict[@"latitudeDelta"] doubleValue],
                .region.longitudeDelta = [regionDict[@"longitudeDelta"] doubleValue],
            };
            mapViewEventEmitter->onRegionChange(data);
        }
    };
    _view.onRegionChangeComplete = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            NSDictionary* regionDict = dictionary[@"region"];
            auto mapViewEventEmitter = std::static_pointer_cast<RNMapsMapViewEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMapViewEventEmitter::OnRegionChangeComplete data = {
                .region.latitude = [regionDict[@"latitude"] doubleValue],
                .region.longitude = [regionDict[@"longitude"] doubleValue],
                .region.latitudeDelta = [regionDict[@"latitudeDelta"] doubleValue],
                .region.longitudeDelta = [regionDict[@"longitudeDelta"] doubleValue],
            };
            mapViewEventEmitter->onRegionChangeComplete(data);
        }
    };
    _view.onDoublePress = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {

            NSDictionary* coordinateDict = dictionary[@"coordinate"];
            NSDictionary* positionDict = dictionary[@"position"];

            // Populate the OnMapPressCoordinate struct
            facebook::react::RNMapsMapViewEventEmitter::OnDoublePressCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            // Populate the OnMapPressPosition struct
            facebook::react::RNMapsMapViewEventEmitter::OnDoublePressPosition position = {
                .x = [positionDict[@"x"] doubleValue],
                .y = [positionDict[@"y"] doubleValue],
            };
            auto mapViewEventEmitter = std::static_pointer_cast<RNMapsMapViewEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMapViewEventEmitter::OnDoublePress data = {
                .action = std::string([@"double-press" UTF8String]),
                .position = position,
                .coordinate = coordinate
            };
            mapViewEventEmitter->onDoublePress(data);
        }
    };
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame: frame]) {
        static const auto defaultProps = std::make_shared<const RNMapsMapViewProps>();
        _props = defaultProps;
        [self prepareMapView];
        self.backgroundColor = [UIColor clearColor];
    }
    return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
    RCTRNMapsMapViewHandlePropsUpdate(self, props, oldProps);
}

- (void)onPropSet:(const Props::Shared &)oldProps propName:(PropName)propName
{
    RCTRNMapsMapViewHandlePropSet(self, propName, _props, oldProps, _propUpdater);
}

- (id<RNMapsHostViewDelegate>) createMapView
{
    [self prepareMapView];
    return (id<RNMapsHostViewDelegate>)_view;
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    _view.frame = self.bounds;
    [_view didSetProps:@[@"frame"]];
}

- (void)didUpdateChildren
{
    [super didUpdateChildren];
}

- (void)prepareForMounting
{
    [super prepareForMounting];
    [self prepareMapView];
}

- (void)dealloc
{
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
    _view.frame = self.bounds;
    [_view didSetProps:@[@"frame"]];
}


- (void) setRef:(NSNumber *)ref
{
    _view.reactTag = ref;
}

- (UIView*) contentView
{
    return _view;
}

- (BOOL)isFlipped
{
    return YES;
}

- (void)didAddSubview:(UIView *)subview
{
    [super didAddSubview:subview];
}

- (void)willRemoveSubview:(UIView *)subview
{
    [super willRemoveSubview:subview];
}

- (void)didSetProps:(facebook::react::PropNameHashSet const &)changedProps
{
    [super didSetProps: changedProps];
}

@end

Class<RCTComponentViewProtocol> RNMapsMapViewCls(void)
{
    return RNMapsMapView.class;
}

#endif

