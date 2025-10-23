//
//  RNMapsMarker.m
//  AirMaps
//
//  Created by Salah Ghanim on 23.11.24.
//  Copyright © 2024 react-native-maps. All rights reserved.
//

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import "RNMapsMarkerView.h"
#import "AIRMap.h"
#import "AIRMapMarker.h"
#import "AIRMapMarkerManager.h"
#if __has_include(<ReactNativeMaps/generated/RNMapsAirModuleDelegate.h>)
#import <ReactNativeMaps/generated/RNMapsHostViewDelegate.h>
#import <ReactNativeMaps/generated/ComponentDescriptors.h>
#import <ReactNativeMaps/generated/EventEmitters.h>
#import <ReactNativeMaps/generated/Props.h>
#import <ReactNativeMaps/generated/RCTComponentViewHelpers.h>
#else
#import "../generated/RNMapsHostViewDelegate.h"
#import "../generated/RNMapsSpecs/ComponentDescriptors.h"
#import "../generated/RNMapsSpecs/EventEmitters.h"
#import "../generated/RNMapsSpecs/Props.h"
#import "../generated/RNMapsSpecs/RCTComponentViewHelpers.h"
#endif
#import "RCTFabricComponentsPlugins.h"
#import <React/RCTConversions.h>
#import "UIView+AirMap.h"

using namespace facebook::react;

@interface RNMapsMarkerView () <RCTRNMapsMarkerViewProtocol>
@end

@implementation RNMapsMarkerView {
    AIRMapMarker *_view;
    AIRMapMarkerManager* _legacyMapManager;
}

- (AIRMapMarker *) marker {
    return _view;
}
- (void) prepareForRecycle
{
    [super prepareForRecycle];
    [_view removeFromSuperview];
    _view = nil;
    _legacyMapManager = nil;
}

#pragma mark - JS Commands


#pragma mark - Native commands

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
    RCTRNMapsMarkerHandleCommand(self, commandName, args);
}


+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<RNMapsMarkerComponentDescriptor>();
}

- (void) animateToCoordinates:(double)latitude longitude:(double)longitude duration:(NSInteger)duration
{
    [_view animateToCoordinate:CLLocationCoordinate2DMake(latitude, longitude) duration:duration/1000];
}

- (void) showCallout
{
    [_view.map selectAnnotation:_view animated:YES];
}

- (void) hideCallout
{
    [_view.map deselectAnnotation:_view animated:YES];

}
- (void) redraw
{
   // do nothing
}
- (void) redrawCallout
{
    // do nothing
}

- (void) setCoordinates:(double)latitude longitude:(double)longitude
{
    [_view setCoordinate:CLLocationCoordinate2DMake(latitude, longitude)];
}



- (void) prepareMarkerView
{
    if (_legacyMapManager && _view) return;
    static const auto defaultProps = std::make_shared<const RNMapsMarkerProps>();
    _props = defaultProps;
    _legacyMapManager = [[AIRMapMarkerManager alloc] init];
    _view = (AIRMapMarker *)[_legacyMapManager view];


    _view.onPress = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            // Extract values from the NSDictionary
            NSDictionary* coordinateDict = dictionary[@"coordinate"];
            NSDictionary* positionDict = dictionary[@"position"];

            // Populate the OnCalloutPressPoint struct
            facebook::react::RNMapsMarkerEventEmitter::OnPressPosition point = {
                .x = [coordinateDict[@"x"] doubleValue],
                .y = [coordinateDict[@"y"] doubleValue],
            };


            facebook::react::RNMapsMarkerEventEmitter::OnPressCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            auto eventEmitter = std::static_pointer_cast<RNMapsMarkerEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMarkerEventEmitter::OnPress data = {
                .action = std::string([dictionary[@"action"] UTF8String]),
                .id = std::string([dictionary[@"id"] UTF8String]),
                .position = point,
                .coordinate = coordinate,
            };
            eventEmitter->onPress(data);
        }
    };

    _view.onDeselect = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            // Extract values from the NSDictionary
            NSDictionary* coordinateDict = dictionary[@"coordinate"];
            NSDictionary* positionDict = dictionary[@"position"];

            // Populate the OnCalloutPressPoint struct
            facebook::react::RNMapsMarkerEventEmitter::OnDeselectPosition point = {
                .x = [coordinateDict[@"x"] doubleValue],
                .y = [coordinateDict[@"y"] doubleValue],
            };


            facebook::react::RNMapsMarkerEventEmitter::OnDeselectCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            auto eventEmitter = std::static_pointer_cast<RNMapsMarkerEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMarkerEventEmitter::OnDeselect data = {
                .action = std::string([dictionary[@"action"] UTF8String]),
                .id = std::string([dictionary[@"id"] UTF8String]),
                .position = point,
                .coordinate = coordinate,
            };
            eventEmitter->onDeselect(data);
        }
    };

    _view.onDrag = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            // Extract values from the NSDictionary
            NSDictionary* coordinateDict = dictionary[@"coordinate"];


            facebook::react::RNMapsMarkerEventEmitter::OnDragCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            auto eventEmitter = std::static_pointer_cast<RNMapsMarkerEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMarkerEventEmitter::OnDrag data = {
                .id = std::string([dictionary[@"id"] UTF8String]),
                .coordinate = coordinate,
            };
            eventEmitter->onDrag(data);
        }
    };
    _view.onDragStart = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            // Extract values from the NSDictionary
            NSDictionary* coordinateDict = dictionary[@"coordinate"];

            facebook::react::RNMapsMarkerEventEmitter::OnDragStartCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            auto eventEmitter = std::static_pointer_cast<RNMapsMarkerEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMarkerEventEmitter::OnDragStart data = {
                .id = std::string([dictionary[@"id"] UTF8String]),
                .coordinate = coordinate,
            };
            eventEmitter->onDragStart(data);
        }
    };

    _view.onDragEnd = [self](NSDictionary* dictionary) {
        if (_eventEmitter) {
            // Extract values from the NSDictionary
            NSDictionary* coordinateDict = dictionary[@"coordinate"];

            facebook::react::RNMapsMarkerEventEmitter::OnDragEndCoordinate coordinate = {
                .latitude = [coordinateDict[@"latitude"] doubleValue],
                .longitude = [coordinateDict[@"longitude"] doubleValue],
            };

            auto eventEmitter = std::static_pointer_cast<RNMapsMarkerEventEmitter const>(_eventEmitter);
            facebook::react::RNMapsMarkerEventEmitter::OnDragEnd data = {
                .id = std::string([dictionary[@"id"] UTF8String]),
                .coordinate = coordinate,
            };
            eventEmitter->onDragEnd(data);
        }
    };
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame: frame]) {
        static const auto defaultProps = std::make_shared<const RNMapsMarkerProps>();
        _props = defaultProps;
        [self prepareMarkerView];
        self.backgroundColor = [UIColor clearColor];
    }

    [_view addObserver:self forKeyPath:@"coordinate" options:0 context:NULL];
    return self;
}

- (NSString *)componentViewName
{
  return @"RNMapsMarker";
}

- (void)didMoveToWindow
{
    [super didMoveToWindow];
    if (self.window) {
        if (!_view.map) {
            UIView* superview = self.superview;
            while (superview != nil && ![superview isKindOfClass:[AIRMap class]]) {
                superview = superview.superview;
            }

            if ([superview isKindOfClass:[AIRMap class]]) {
                ((AIRMap*)superview).delegate = _view;
                _view.map = (AIRMap*)superview;
            }
        }
    } else {
        _view.map = nil;
    }
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
    RCTRNMapsMarkerViewHandlePropsUpdate(self, props, oldProps);
}

- (void)onPropSet:(const Props::Shared &)oldProps propName:(PropName)propName
{
    RCTRNMapsMarkerViewHandlePropSet(self, propName, _props, oldProps, _propUpdater);
}

- (AIRMapMarker *) createMarker
{
    [self prepareMarkerView];
    return _view;
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    _view.frame = self.bounds;

    [_view didSetProps:@[@"frame"]];
    [_view setCenterOffset:_view.centerOffset];
}

- (void)didUpdateChildren
{
    [super didUpdateChildren];
    _view.frame = self.bounds;
    [_view didSetProps:@[@"frame"]];
}

- (void)prepareForMounting
{
    [super prepareForMounting];
    [self prepareMarkerView];

    [_view addObserver:self forKeyPath:@"coordinate" options:0 context:NULL];
    [_view removeFromSuperview];
    [self.contentView addSubview:_view];
}

- (void)dealloc
{
    [_view removeObserver:self forKeyPath:@"coordinate"];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
    _view.frame = self.bounds;
}


- (void) setRef:(NSNumber *)ref
{
    _view.reactTag = ref;
}

- (UIView*) contentView
{
    return _view;
}

- (void) insertReactSubview:(UIView*)subview atIndex:(NSInteger)atIndex
{
    [_view insertReactSubview:subview atIndex:(NSInteger)atIndex];
}

- (void) removeReactSubview:(UIView*)subview
{
    [_view removeReactSubview:subview];
}

- (NSArray<UIView *> *)reactSubviews
{
    return _view.reactSubviews;
}

- (BOOL)isFlipped
{
    return YES;
}

- (void)didAddSubview:(UIView *)subview
{
    [super didAddSubview:subview];
    [self onSubviewsUpdated];
}

- (void)willRemoveSubview:(UIView *)subview
{
    [super willRemoveSubview:subview];
    [self onSubviewsUpdated];
}
- (void) onSubviewsUpdated
{
    if (_view.hasChildren == self.subviews.count > 0) return;
    _view.hasChildren = self.subviews.count > 0;
    _view.tracksViewChanges = _view.hasChildren;

    [_view didSetProps:@[@"hasChildren", @"tracksViewChanges"]];
}

- (void)didSetProps:(facebook::react::PropNameHashSet const &)changedProps
{
    [super didSetProps: changedProps];
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary<NSKeyValueChangeKey,id> *)change
                       context:(void *)context
{
    if ([keyPath isEqualToString:@"coordinate"]) {
        RCTManagedPointer cManagedPointer = {_view.coordinateWrapper};

        facebook::react::RNMapsMarkerEventEmitter::OnSetCoordinate data = {
            .coordinate = facebook::react::RNMapsMarkerEventEmitter::OnSetCoordinateCoordinate{
                .latitude = cManagedPointer.geometry.coordinates.latitude,
                .longitude = cManagedPointer.geometry.coordinates.longitude,
            }
        };
        auto eventEmitter = std::static_pointer_cast<RNMapsMarkerEventEmitter const>(_eventEmitter);
        eventEmitter->onSetCoordinate(data);
    }
}

@end

Class<RCTComponentViewProtocol> RNMapsMarkerCls(void)
{
    return RNMapsMarkerView.class;
}

#endif
